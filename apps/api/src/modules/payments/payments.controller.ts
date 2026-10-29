import {
  Controller,
  Post,
  Body,
  Headers,
  Param,
  UseGuards,
  UsePipes,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { Public } from "../../core/decorators/public.decorator";
import { Roles } from "../../core/decorators/roles.decorator";
import { RolesGuard } from "../../core/guards/roles.guard";
import { TenantGuard } from "../../core/guards/tenant.guard";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../core/pipes/zod-validation.pipe";
import {
  InitPaymentTransactionSchema,
  InitPaymentTransactionInput,
  RecordManualPaymentSchema,
  RecordManualPaymentInput,
  PaymentGateway,
  UserRole,
  UserJwtPayload,
} from "@conectajac/shared";

@ApiTags("Pagos y Recaudos")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("initiate")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Iniciar pasarela de pago digital",
    description: "Genera enlace de pago Wompi / PSE / Tarjeta para cuotas comunales u órdenes del mercado campesino",
  })
  @ApiResponse({ status: 200, description: "Sesión de checkout creada exitosamente" })
  @UsePipes(new ZodValidationPipe(InitPaymentTransactionSchema))
  async initiatePayment(
    @CurrentUser() user: UserJwtPayload,
    @Body() body: InitPaymentTransactionInput
  ) {
    return this.paymentsService.initiatePayment(user.sub, body);
  }

  @Public()
  @Post("webhook/:gateway")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Webhook para confirmación de pasarelas de pago",
    description: "Receptor desatendido para eventos de Wompi / MercadoPago con validación de firma criptográfica",
  })
  async handleWebhook(
    @Param("gateway") gateway: PaymentGateway,
    @Headers() headers: Record<string, string>,
    @Body() body: Record<string, unknown>
  ) {
    return this.paymentsService.handleWebhook(gateway, headers, body);
  }

  @Post("manual-cash")
  @ApiBearerAuth()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_TREASURER
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Registrar recaudo en efectivo (Tesorero)",
    description: "Asienta el pago físico presencial en el Libro de Tesorería con número de recibo y comprobante",
  })
  @ApiResponse({ status: 201, description: "Recaudo en efectivo asentado con éxito" })
  @UsePipes(new ZodValidationPipe(RecordManualPaymentSchema))
  async recordManualCashPayment(
    @CurrentUser() user: UserJwtPayload,
    @Body() body: RecordManualPaymentInput
  ) {
    return this.paymentsService.recordManualCashPayment(user.sub, body);
  }
}


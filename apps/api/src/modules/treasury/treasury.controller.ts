import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { TreasuryService } from "./treasury.service";
import { Roles } from "../../core/decorators/roles.decorator";
import { RolesGuard } from "../../core/guards/roles.guard";
import { TenantGuard } from "../../core/guards/tenant.guard";
import { CurrentTenant } from "../../core/decorators/current-tenant.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../core/pipes/zod-validation.pipe";
import {
  CreateFeeConfigSchema,
  CreateFeeConfigInput,
  CreateTreasuryAccountSchema,
  CreateTreasuryAccountInput,
  CreateTreasuryMovementSchema,
  CreateTreasuryMovementInput,
  UserRole,
  UserJwtPayload,
  TreasuryTransactionType,
} from "@conectajac/shared";

@ApiTags("Tesorería y Finanzas")
@ApiBearerAuth()
@Controller("treasury")
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Post("fees")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_TREASURER
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Configurar cuota comunal (ordinaria, extraordinaria)",
    description: "Define el monto, periodicidad y día de vencimiento de las cuotas de la JAC",
  })
  @ApiResponse({ status: 201, description: "Cuota configurada exitosamente" })
  @UsePipes(new ZodValidationPipe(CreateFeeConfigSchema))
  async createFeeConfig(@Body() body: CreateFeeConfigInput) {
    return this.treasuryService.createFeeConfig(body);
  }

  @Get("fees")
  @UseGuards(TenantGuard)
  @ApiOperation({
    summary: "Listar cuotas vigentes de la JAC",
    description: "Permite consultar los tipos de cuotas aprobados por la asamblea",
  })
  async getFeeConfigs(@CurrentTenant() jacId: string) {
    return this.treasuryService.getFeeConfigs(jacId);
  }

  @Post("fees/generate-obligations")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_TREASURER
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Generar obligaciones de cuota masivas para el periodo",
    description: "Asigna la cuota a todos los afiliados activos de la JAC (ej: periodo 2026-11)",
  })
  async generatePeriodObligations(
    @CurrentTenant() jacId: string,
    @Body() body: { feeConfigId: string; period: string }
  ) {
    return this.treasuryService.generatePeriodObligations(
      jacId,
      body.feeConfigId,
      body.period
    );
  }

  @Get("accounts")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_TREASURER,
    UserRole.JAC_FISCAL
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Consultar cuentas y balances de tesorería",
    description: "Caja general, cuentas bancarias y fondos de proyectos comunales",
  })
  async getAccounts(@CurrentTenant() jacId: string) {
    return this.treasuryService.getAccounts(jacId);
  }

  @Post("accounts")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_TREASURER
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Crear cuenta contable en tesorería",
    description: "Añade una cuenta de caja o bancaria para el manejo de fondos de la JAC",
  })
  @UsePipes(new ZodValidationPipe(CreateTreasuryAccountSchema))
  async createAccount(@Body() body: CreateTreasuryAccountInput) {
    return this.treasuryService.createAccount(body);
  }

  @Get("movements")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_TREASURER,
    UserRole.JAC_FISCAL
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Consultar Libro de Tesorería (Ingresos y Egresos)",
    description: "Movimientos contables detallados con saldo progresivo y soporte de comprobantes",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "accountId", required: false, type: String })
  @ApiQuery({ name: "type", required: false, enum: TreasuryTransactionType })
  async getMovements(
    @CurrentTenant() jacId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("accountId") accountId?: string,
    @Query("type") type?: TreasuryTransactionType
  ) {
    return this.treasuryService.getMovements(jacId, {
      page,
      limit,
      accountId,
      type,
    });
  }

  @Post("movements")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_TREASURER
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Asentar movimiento contable en el Libro de Tesorería",
    description: "Registra egresos por compras comunitarias o ingresos varios con comprobante adjunto",
  })
  @UsePipes(new ZodValidationPipe(CreateTreasuryMovementSchema))
  async createMovement(
    @CurrentUser() user: UserJwtPayload,
    @Body() body: CreateTreasuryMovementInput
  ) {
    return this.treasuryService.createMovement(user.sub, body);
  }

  @Get("summary")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_TREASURER,
    UserRole.JAC_FISCAL
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Informe financiero consolidado de la JAC",
    description: "Resumen de saldos totales y porcentaje de recaudo para presentación a la Asamblea General",
  })
  async getFinancialSummary(@CurrentTenant() jacId: string) {
    return this.treasuryService.getFinancialSummary(jacId);
  }
}

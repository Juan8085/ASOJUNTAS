import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
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
  UpdateFeeConfigSchema,
  UpdateFeeConfigInput,
  RegisterAffiliatePaymentSchema,
  RegisterAffiliatePaymentInput,
  ImportAffiliatesBulkSchema,
  ImportAffiliatesBulkInput,
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

  @Patch("fees/:id")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_TREASURER
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Actualizar tarifa, vigencia y aprobación de cuota",
    description: "Modifica monto, fecha de aprobación por asamblea y fecha de caducidad",
  })
  async updateFeeConfig(
    @Param("id") id: string,
    @CurrentTenant() jacId: string,
    @Body(new ZodValidationPipe(UpdateFeeConfigSchema)) body: UpdateFeeConfigInput
  ) {
    return this.treasuryService.updateFeeConfig(id, jacId, body);
  }

  @Get("fees")
  @UseGuards(TenantGuard)
  @ApiOperation({
    summary: "Listar cuotas vigentes de la JAC",
    description: "Permite consultar los tipos de cuotas aprobados por la asamblea y su caducidad",
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

  @Get("affiliates-portfolio")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_TREASURER,
    UserRole.JAC_FISCAL
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Cartera consolidada de afiliados y cuotas de la JAC",
    description: "Lista de todos los afiliados con su saldo deudor, cuotas pendientes y estado de morosidad",
  })
  async getAffiliatesPortfolio(
    @CurrentTenant() jacId: string,
    @Query("search") search?: string
  ) {
    return this.treasuryService.getAffiliatesPortfolio(jacId, search);
  }

  @Post("register-affiliate-payment")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_TREASURER
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Registrar recaudo de cuotas (Efectivo o En Cuenta)",
    description: "Calcula cuotas canceladas, saldo remanente y actualiza suspensión por mora",
  })
  async registerAffiliatePayment(
    @CurrentUser() user: UserJwtPayload,
    @Body(new ZodValidationPipe(RegisterAffiliatePaymentSchema))
    body: RegisterAffiliatePaymentInput
  ) {
    return this.treasuryService.registerAffiliatePayment(user.sub, body);
  }

  @Post("affiliates/check-morosity-suspensions")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_TREASURER,
    UserRole.JAC_FISCAL
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Auditar y aplicar suspensión por mora superior a 3 cuotas (Ley 2166 de 2021)",
    description: "Suspende automáticamente a afiliados con 3+ meses sin pagar y reactiva a quienes abonaron",
  })
  async checkMorositySuspensions(@CurrentTenant() jacId: string) {
    return this.treasuryService.checkMorositySuspensions(jacId);
  }

  @Post("affiliates/import-bulk")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_TREASURER
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Importar masivamente afiliados y cartera inicial desde plantilla Excel/CSV",
    description: "Crea usuarios, membresías con folio y asienta las cuotas/saldos adeudados",
  })
  async importAffiliatesBulk(
    @CurrentTenant() jacId: string,
    @Body(new ZodValidationPipe(ImportAffiliatesBulkSchema))
    body: ImportAffiliatesBulkInput
  ) {
    return this.treasuryService.importAffiliatesBulk(jacId, body);
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
    summary: "Consultar Libro de Tesorería (Ingresos y Egresos no relacionados con cuotas)",
    description: "Movimientos contables detallados con saldo progresivo y soporte de comprobantes",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "accountId", required: false, type: String })
  @ApiQuery({ name: "type", required: false, enum: TreasuryTransactionType })
  @ApiQuery({ name: "excludeFees", required: false, type: Boolean })
  async getMovements(
    @CurrentTenant() jacId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("accountId") accountId?: string,
    @Query("type") type?: TreasuryTransactionType,
    @Query("excludeFees") excludeFees?: string
  ) {
    return this.treasuryService.getMovements(jacId, {
      page,
      limit,
      accountId,
      type,
      excludeFees: excludeFees !== "false",
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

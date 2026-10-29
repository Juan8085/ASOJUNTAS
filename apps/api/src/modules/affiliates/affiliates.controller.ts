import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { AffiliatesService } from "./affiliates.service";
import { Roles } from "../../core/decorators/roles.decorator";
import { RolesGuard } from "../../core/guards/roles.guard";
import { TenantGuard } from "../../core/guards/tenant.guard";
import { CurrentTenant } from "../../core/decorators/current-tenant.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import {
  UserRole,
  MembershipStatus,
  UserJwtPayload,
  IdentificationType,
} from "@conectajac/shared";

@ApiTags("Libro de Afiliados")
@ApiBearerAuth()
@Controller("affiliates")
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @Get("me")
  @ApiOperation({
    summary: "Consultar mi estado de afiliación",
    description: "Permite al habitante consultar sus libros, folios y estado en las JACs a las que pertenece",
  })
  async getMyAffiliation(
    @CurrentUser() user: UserJwtPayload,
    @CurrentTenant() tenantId?: string
  ) {
    return this.affiliatesService.getMyAffiliation(user.sub, tenantId);
  }

  @Get("book")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_SECRETARY,
    UserRole.JAC_FISCAL
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Consultar Libro Digital de Afiliados (Directivos)",
    description: "Consulta paginada con filtros por estado, rol o búsqueda por documento y vereda",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "status", required: false, enum: MembershipStatus })
  @ApiQuery({ name: "role", required: false, enum: UserRole })
  async getBook(
    @CurrentTenant() jacId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
    @Query("status") status?: MembershipStatus,
    @Query("role") role?: UserRole
  ) {
    return this.affiliatesService.getBook(jacId, {
      page,
      limit,
      search,
      status,
      role,
    });
  }

  @Get("book/:id")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_SECRETARY,
    UserRole.JAC_FISCAL
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Ver detalle de folio de afiliado",
    description: "Obtiene los datos completos del Libro Digital para un afiliado específico",
  })
  async getEntryById(
    @CurrentTenant() jacId: string,
    @Param("id") id: string
  ) {
    return this.affiliatesService.getEntryById(jacId, id);
  }

  @Post("enroll")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_SECRETARY
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Inscripción formal manual en el Libro Digital",
    description: "Inscribe a un afiliado presencial o recopilado en libro físico de vereda, asignando folio consecutivo",
  })
  @ApiResponse({ status: 201, description: "Afiliado inscrito en el Libro Digital" })
  async manualEnroll(
    @CurrentTenant() jacId: string,
    @Body()
    body: {
      identificationType: IdentificationType;
      identificationNumber: string;
      firstName: string;
      lastName: string;
      email?: string;
      phone: string;
      address: string;
      veredaOrBarrio: string;
      occupation?: string;
      hasLandOrFarm?: boolean;
      farmName?: string;
      observations?: string;
      role?: UserRole;
    }
  ) {
    return this.affiliatesService.manualEnroll(jacId, body);
  }

  @Patch("book/:id/status")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_SECRETARY
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Actualizar estado de afiliación",
    description: "Permite suspender, inactivar o reactivar un afiliado indicando la causal",
  })
  async updateStatus(
    @CurrentTenant() jacId: string,
    @Param("id") id: string,
    @Body() body: { status: MembershipStatus; reason?: string }
  ) {
    return this.affiliatesService.updateStatus(jacId, id, body);
  }
}


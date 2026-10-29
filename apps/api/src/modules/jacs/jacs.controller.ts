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
import { JacsService } from "./jacs.service";
import { Public } from "../../core/decorators/public.decorator";
import { Roles } from "../../core/decorators/roles.decorator";
import { RolesGuard } from "../../core/guards/roles.guard";
import { TenantGuard } from "../../core/guards/tenant.guard";
import { ZodValidationPipe } from "../../core/pipes/zod-validation.pipe";
import {
  CreateJacSchema,
  CreateJacInput,
  UpdateJacSettingsSchema,
  UpdateJacSettingsInput,
  UserRole,
} from "@conectajac/shared";

@ApiTags("Juntas de Acción Comunal")
@Controller("jacs")
export class JacsController {
  constructor(private readonly jacsService: JacsService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Registrar nueva JAC (Asojuntas / Super Admin)",
    description: "Crea una Junta de Acción Comunal en el sistema junto a su usuario directivo principal",
  })
  @ApiResponse({ status: 201, description: "JAC creada con éxito" })
  @ApiResponse({ status: 403, description: "Solo Super Admin de Asojuntas puede crear JACs" })
  @UsePipes(new ZodValidationPipe(CreateJacSchema))
  async createJac(@Body() body: CreateJacInput) {
    return this.jacsService.createJac(body);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: "Listar Juntas de Acción Comunal",
    description: "Consulta pública del directorio de JACs con conteo de afiliados y filtros por vereda o municipio",
  })
  @ApiQuery({ name: "municipalityId", required: false, type: String })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "isActive", required: false, type: Boolean })
  async findAll(
    @Query("municipalityId") municipalityId?: string,
    @Query("search") search?: string,
    @Query("isActive") isActive?: string
  ) {
    return this.jacsService.findAll({
      municipalityId,
      search,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    });
  }

  @Public()
  @Get(":id")
  @ApiOperation({
    summary: "Obtener detalle institucional de una JAC",
    description: "Retorna directivos, escudo institucional, ubicación y estadísticas públicas",
  })
  @ApiResponse({ status: 200, description: "JAC encontrada" })
  @ApiResponse({ status: 404, description: "JAC no encontrada" })
  async findById(@Param("id") id: string) {
    return this.jacsService.findById(id);
  }

  @Patch(":id/settings")
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.JAC_ADMIN, UserRole.JAC_PRESIDENT)
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Actualizar configuración y cuentas bancarias de la JAC",
    description: "Permite a los directivos actualizar colores, sellos oficiales y datos bancarios para recaudo",
  })
  @ApiResponse({ status: 200, description: "Configuración actualizada con éxito" })
  @UsePipes(new ZodValidationPipe(UpdateJacSettingsSchema))
  async updateSettings(
    @Param("id") id: string,
    @Body() body: UpdateJacSettingsInput
  ) {
    return this.jacsService.updateSettings(id, body);
  }
}

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
import { AssembliesService } from "./assemblies.service";
import { Roles } from "../../core/decorators/roles.decorator";
import { RolesGuard } from "../../core/guards/roles.guard";
import { TenantGuard } from "../../core/guards/tenant.guard";
import { CurrentTenant } from "../../core/decorators/current-tenant.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../core/pipes/zod-validation.pipe";
import {
  CreateAssemblySchema,
  CreateAssemblyInput,
  CastAssemblyVoteSchema,
  CastAssemblyVoteInput,
  AssemblyStatus,
  UserRole,
  UserJwtPayload,
} from "@conectajac/shared";

@ApiTags("Asambleas y Votaciones")
@ApiBearerAuth()
@Controller("assemblies")
export class AssembliesController {
  constructor(private readonly assembliesService: AssembliesService) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_SECRETARY
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Convocar Asamblea General (Directivos)",
    description: "Crea la citación a asamblea ordinaria o extraordinaria con cálculo de quórum estatutario",
  })
  @ApiResponse({ status: 201, description: "Asamblea convocada exitosamente" })
  @UsePipes(new ZodValidationPipe(CreateAssemblySchema))
  async createAssembly(@Body() body: CreateAssemblyInput) {
    return this.assembliesService.createAssembly(body);
  }

  @Get()
  @UseGuards(TenantGuard)
  @ApiOperation({
    summary: "Listar asambleas de la JAC",
    description: "Permite a los afiliados consultar convocatorias programadas y asambleas pasadas",
  })
  @ApiQuery({ name: "status", required: false, enum: AssemblyStatus })
  async getAssemblies(
    @CurrentTenant() jacId: string,
    @Query("status") status?: AssemblyStatus
  ) {
    return this.assembliesService.getAssemblies(jacId, status);
  }

  @Get(":id")
  @UseGuards(TenantGuard)
  @ApiOperation({
    summary: "Obtener detalle de la asamblea y temas a votar",
    description: "Retorna el orden del día, temas abiertos para votación y estado del quórum",
  })
  async getAssemblyDetail(
    @CurrentTenant() jacId: string,
    @Param("id") id: string,
    @CurrentUser() user: UserJwtPayload
  ) {
    return this.assembliesService.getAssemblyDetail(id, jacId, user.sub);
  }

  @Post(":id/topics")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_SECRETARY
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Agregar tema / punto de votación a la asamblea",
    description: "Configura una moción o elección con opciones personalizadas (A favor, En contra, etc.)",
  })
  async addTopic(
    @CurrentTenant() jacId: string,
    @Param("id") id: string,
    @Body()
    body: {
      title: string;
      description?: string;
      options: Array<{ id: string; label: string }>;
    }
  ) {
    return this.assembliesService.addTopic(id, jacId, body);
  }

  @Post("vote")
  @UseGuards(TenantGuard)
  @ApiOperation({
    summary: "Emitir voto electrónico secreto",
    description: "Registra el voto criptográfico del habitante veredal garantizando no repudio y anonimato",
  })
  @ApiResponse({ status: 200, description: "Voto registrado exitosamente" })
  @ApiResponse({ status: 409, description: "Ya ha emitido su voto en este punto" })
  @UsePipes(new ZodValidationPipe(CastAssemblyVoteSchema))
  async castVote(
    @CurrentUser() user: UserJwtPayload,
    @Body() body: CastAssemblyVoteInput
  ) {
    return this.assembliesService.castVote(user.sub, body);
  }

  @Patch("topics/:topicId/close")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_SECRETARY
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Cerrar votación y obtener escrutinio (Directivos)",
    description: "Cierra la recepción de votos y computa los porcentajes y totales finales por opción",
  })
  async closeTopicAndTally(
    @CurrentTenant() jacId: string,
    @Param("topicId") topicId: string
  ) {
    return this.assembliesService.closeTopicAndTally(topicId, jacId);
  }

  @Patch(":id/status")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_SECRETARY
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Actualizar estado de la asamblea y adjuntar acta",
    description: "Permite iniciar la asamblea, confirmar quórum y finalizar adjuntando acta PDF",
  })
  async updateStatus(
    @CurrentTenant() jacId: string,
    @Param("id") id: string,
    @Body()
    body: {
      status: AssemblyStatus;
      quorumReached?: boolean;
      minutesPdfUrl?: string;
    }
  ) {
    return this.assembliesService.updateStatus(id, jacId, body);
  }
}

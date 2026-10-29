import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { MingasService } from "./mingas.service";
import { Roles } from "../../core/decorators/roles.decorator";
import { RolesGuard } from "../../core/guards/roles.guard";
import { TenantGuard } from "../../core/guards/tenant.guard";
import { CurrentTenant } from "../../core/decorators/current-tenant.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../core/pipes/zod-validation.pipe";
import {
  CreatePostSchema,
  CreatePostInput,
  MingaAttendanceSchema,
  MingaAttendanceInput,
  UserRole,
  UserJwtPayload,
} from "@conectajac/shared";

@ApiTags("Mingas y Trabajos Comunitarios")
@ApiBearerAuth()
@Controller("mingas")
export class MingasController {
  constructor(private readonly mingasService: MingasService) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_VICE_PRESIDENT,
    UserRole.JAC_SECRETARY
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Convocar Minga / Trabajo Comunitario (Directivos)",
    description: "Crea la citación oficial para limpieza de vías, acueducto o salón comunal con fecha y lugar",
  })
  @ApiResponse({ status: 201, description: "Minga convocada exitosamente" })
  @UsePipes(new ZodValidationPipe(CreatePostSchema))
  async createMinga(
    @CurrentUser() user: UserJwtPayload,
    @Body() body: CreatePostInput
  ) {
    return this.mingasService.createMinga(user.sub, body);
  }

  @Get()
  @UseGuards(TenantGuard)
  @ApiOperation({
    summary: "Listar mingas de la vereda o barrio",
    description: "Permite ver trabajos comunitarios programados y pasados con total de confirmados y asistentes",
  })
  async getMingas(@CurrentTenant() jacId: string) {
    return this.mingasService.getMingas(jacId);
  }

  @Get(":postId/attendees")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_VICE_PRESIDENT,
    UserRole.JAC_SECRETARY,
    UserRole.JAC_FISCAL
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Consultar planilla de asistencia de la minga",
    description: "Listado de afiliados con estado de confirmación y asistencia presencial verificada",
  })
  async getMingaAttendanceList(
    @CurrentTenant() jacId: string,
    @Param("postId") postId: string
  ) {
    return this.mingasService.getMingaAttendanceList(jacId, postId);
  }

  @Post("confirm")
  @UseGuards(TenantGuard)
  @ApiOperation({
    summary: "Confirmar asistencia a la minga (Habitante)",
    description: "El afiliado confirma si participará en el trabajo comunitario o indica el motivo de impedimento",
  })
  @UsePipes(new ZodValidationPipe(MingaAttendanceSchema))
  async confirmAttendance(
    @CurrentUser() user: UserJwtPayload,
    @CurrentTenant() jacId: string,
    @Body() body: MingaAttendanceInput
  ) {
    return this.mingasService.confirmAttendance(user.sub, jacId, body);
  }

  @Post(":postId/attendance")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_VICE_PRESIDENT
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Asentar lista de asistencia presencial (Directivos/Capataz)",
    description: "Registra en territorio quiénes asistieron efectivamente con herramientas al trabajo comunitario",
  })
  async recordAttendance(
    @CurrentTenant() jacId: string,
    @Param("postId") postId: string,
    @Body()
    body: {
      attendees: Array<{ userId: string; attended: boolean; notes?: string }>;
    }
  ) {
    return this.mingasService.recordAttendance(jacId, postId, body.attendees);
  }

  @Post(":postId/penalties")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_TREASURER
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Generar compensaciones en Tesorería por inasistencia a la minga",
    description: "Carga automáticamente la multa comunal de compensación a los afiliados que no se presentaron",
  })
  async applyAbsencePenalties(
    @CurrentTenant() jacId: string,
    @Param("postId") postId: string,
    @Body() body: { fineAmount: number; description?: string }
  ) {
    return this.mingasService.applyAbsencePenalties(
      jacId,
      postId,
      body.fineAmount,
      body.description
    );
  }
}


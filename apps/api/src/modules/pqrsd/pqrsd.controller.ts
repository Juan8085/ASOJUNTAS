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
import { PqrsdService } from "./pqrsd.service";
import { Roles } from "../../core/decorators/roles.decorator";
import { RolesGuard } from "../../core/guards/roles.guard";
import { TenantGuard } from "../../core/guards/tenant.guard";
import { CurrentTenant } from "../../core/decorators/current-tenant.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../core/pipes/zod-validation.pipe";
import {
  CreatePqrsdSchema,
  CreatePqrsdInput,
  RespondPqrsdSchema,
  RespondPqrsdInput,
  PqrsdStatus,
  PqrsdType,
  UserRole,
  UserJwtPayload,
} from "@conectajac/shared";

@ApiTags("PQRSD Comunal")
@ApiBearerAuth()
@Controller("pqrsd")
export class PqrsdController {
  constructor(private readonly pqrsdService: PqrsdService) {}

  @Post()
  @ApiOperation({
    summary: "Radicar PQRSD ciudadana",
    description: "Permite enviar Peticiones, Quejas, Reclamos o Sugerencias a la directiva de la JAC",
  })
  @ApiResponse({ status: 201, description: "PQRSD radicada con éxito y número de radicado asignado" })
  @UsePipes(new ZodValidationPipe(CreatePqrsdSchema))
  async createTicket(
    @CurrentUser() user: UserJwtPayload,
    @Body() body: CreatePqrsdInput
  ) {
    return this.pqrsdService.createTicket(user?.sub ?? null, body);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_SECRETARY,
    UserRole.JAC_FISCAL
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Consultar solicitudes ciudadanas (Directivos)",
    description: "Bandeja de entrada de PQRSD de la JAC con filtros por estado y tipo",
  })
  @ApiQuery({ name: "status", required: false, enum: PqrsdStatus })
  @ApiQuery({ name: "type", required: false, enum: PqrsdType })
  async getTickets(
    @CurrentTenant() jacId: string,
    @Query("status") status?: PqrsdStatus,
    @Query("type") type?: PqrsdType
  ) {
    return this.pqrsdService.getTickets(jacId, { status, type });
  }

  @Get("my-tickets")
  @ApiOperation({
    summary: "Consultar mis solicitudes radicadas (Ciudadano)",
    description: "Historial de trámites y respuestas oficiales recibidas de la JAC",
  })
  async getMyTickets(@CurrentUser() user: UserJwtPayload) {
    return this.pqrsdService.getMyTickets(user.sub);
  }

  @Patch(":id/assign")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_SECRETARY
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Asignar PQRSD a directivo para trámite",
    description: "Asigna la investigación o respuesta del ticket a un directivo o comisión de trabajo",
  })
  async assignTicket(
    @CurrentTenant() jacId: string,
    @Param("id") id: string,
    @Body() body: { assignedToUserId: string }
  ) {
    return this.pqrsdService.assignTicket(id, jacId, body.assignedToUserId);
  }

  @Post("respond")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_SECRETARY,
    UserRole.JAC_FISCAL
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Responder formalmente a una PQRSD (Directivos)",
    description: "Emite el concepto o solución oficial al ciudadano cerrando o resolviendo el ticket",
  })
  @UsePipes(new ZodValidationPipe(RespondPqrsdSchema))
  async respondTicket(@Body() body: RespondPqrsdInput) {
    return this.pqrsdService.respondTicket(body);
  }
}

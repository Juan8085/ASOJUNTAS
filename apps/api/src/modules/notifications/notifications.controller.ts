import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { Roles } from "../../core/decorators/roles.decorator";
import { RolesGuard } from "../../core/guards/roles.guard";
import { TenantGuard } from "../../core/guards/tenant.guard";
import { CurrentTenant } from "../../core/decorators/current-tenant.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import {
  NotificationChannel,
  UserRole,
  UserJwtPayload,
} from "@conectajac/shared";

@ApiTags("Notificaciones Comunitarias")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("my")
  @ApiOperation({
    summary: "Consultar mis notificaciones (Habitante)",
    description: "Bandeja de entrada comunitaria con citaciones, alertas y paz y salvos",
  })
  async getMyNotifications(
    @CurrentUser() user: UserJwtPayload,
    @CurrentTenant() jacId?: string
  ) {
    return this.notificationsService.getMyNotifications(user.sub, jacId);
  }

  @Patch(":id/read")
  @ApiOperation({
    summary: "Marcar notificación como leída",
    description: "Actualiza el estado de lectura de la notificación",
  })
  async markAsRead(
    @CurrentUser() user: UserJwtPayload,
    @Param("id") id: string
  ) {
    return this.notificationsService.markAsRead(user.sub, id);
  }

  @Post("broadcast")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_SECRETARY
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Difusión masiva a la vereda / barrio (Directivos)",
    description: "Envía alertas comunitarias urgentes o citaciones a todos los afiliados por WhatsApp o Push",
  })
  @ApiResponse({ status: 200, description: "Difusión comunitaria completada" })
  async broadcastToJac(
    @CurrentTenant() jacId: string,
    @Body()
    body: {
      channel: NotificationChannel;
      title: string;
      body: string;
      templateId?: string;
    }
  ) {
    return this.notificationsService.broadcastToJac(
      jacId,
      body.channel,
      body.title,
      body.body,
      body.templateId
    );
  }
}


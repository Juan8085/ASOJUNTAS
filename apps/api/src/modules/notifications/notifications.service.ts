import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "@conectajac/database";
import { WhatsAppCloudAdapter } from "./infrastructure/whatsapp-cloud.adapter";
import { ExpoPushAdapter } from "./infrastructure/expo-push.adapter";
import { NotificationDispatchResult } from "./domain/notification-dispatcher.port";
import { NotificationChannel, MembershipStatus } from "@conectajac/shared";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppAdapter: WhatsAppCloudAdapter,
    private readonly expoPushAdapter: ExpoPushAdapter
  ) {}

  /**
   * Enviar notificación individual y registrar en auditoría de notificaciones
   */
  async sendToUser(
    userId: string,
    jacId: string | null,
    channel: NotificationChannel,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    templateId?: string,
    templateParams?: string[]
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }

    let dispatchResult: NotificationDispatchResult = { success: false };

    if (channel === NotificationChannel.WHATSAPP) {
      dispatchResult = await this.whatsAppAdapter.send({
        to: user.phone,
        title,
        body,
        data,
        templateId,
        templateParams,
      });
    } else if (channel === NotificationChannel.PUSH) {
      // Si el payload contiene push token en data
      const token = (data?.pushToken as string) || "";
      if (token.startsWith("ExponentPushToken")) {
        dispatchResult = await this.expoPushAdapter.send({
          to: token,
          title,
          body,
          data,
        });
      } else {
        dispatchResult = { success: false, error: "Push token no disponible para el usuario" };
      }
    }

    // Registrar en base de datos
    await this.prisma.notification.create({
      data: {
        jacId,
        userId,
        channel,
        title,
        body,
        data: (data || {}) as Prisma.InputJsonValue,
        status: dispatchResult.success ? "SENT" : "FAILED",
        externalMessageId: dispatchResult.messageId ?? null,
      },
    });

    return dispatchResult;
  }

  /**
   * Difusión masiva comunitaria (WhatsApp o Push) a todos los afiliados activos de la JAC
   */
  async broadcastToJac(
    jacId: string,
    channel: NotificationChannel,
    title: string,
    body: string,
    templateId?: string
  ) {
    const activeMembers = await this.prisma.jacMembership.findMany({
      where: { jacId, status: MembershipStatus.ACTIVE },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    this.logger.log(
      `Iniciando difusión comunitaria por ${channel} a ${activeMembers.length} afiliados en JAC: ${jacId}`
    );

    let sentCount = 0;
    let failedCount = 0;

    for (const member of activeMembers) {
      try {
        const result = await this.sendToUser(
          member.userId,
          jacId,
          channel,
          title,
          body,
          {},
          templateId
        );
        if (result.success) sentCount++;
        else failedCount++;
      } catch (err) {
        failedCount++;
        this.logger.warn(`Error enviando notificación a ${member.user.phone}: ${(err as Error).message}`);
      }
    }

    return {
      message: "Difusión comunitaria completada",
      totalMembers: activeMembers.length,
      sentCount,
      failedCount,
    };
  }

  /**
   * Consultar historial de notificaciones del habitante
   */
  async getMyNotifications(userId: string, jacId?: string) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(jacId && { jacId }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }
}

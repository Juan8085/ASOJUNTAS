import { Injectable, Logger } from "@nestjs/common";
import {
  INotificationDispatcher,
  SendNotificationPayload,
  NotificationDispatchResult,
} from "../domain/notification-dispatcher.port";
import { NotificationChannel } from "@conectajac/shared";

@Injectable()
export class ExpoPushAdapter implements INotificationDispatcher {
  readonly channel = NotificationChannel.PUSH;
  private readonly logger = new Logger(ExpoPushAdapter.name);

  private readonly expoPushUrl = "https://exp.host/--/api/v2/push/send";

  async send(payload: SendNotificationPayload): Promise<NotificationDispatchResult> {
    if (!payload.to.startsWith("ExponentPushToken")) {
      return {
        success: false,
        error: "Token de Expo Push no válido",
      };
    }

    try {
      const response = await fetch(this.expoPushUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: payload.to,
          sound: "default",
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
        }),
      });

      const resData = (await response.json()) as { data?: { id?: string; status?: string; message?: string } };

      if (!response.ok || resData.data?.status === "error") {
        this.logger.error(`Error enviando Expo Push: ${resData.data?.message || response.statusText}`);
        return {
          success: false,
          error: resData.data?.message || "Fallo en envío push",
        };
      }

      return {
        success: true,
        messageId: resData.data?.id,
      };
    } catch (error) {
      this.logger.error(`Fallo en adaptador de Expo Push: ${(error as Error).message}`);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}


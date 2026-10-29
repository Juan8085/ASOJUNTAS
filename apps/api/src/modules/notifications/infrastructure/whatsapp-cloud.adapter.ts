import { Injectable, Logger } from "@nestjs/common";
import {
  INotificationDispatcher,
  SendNotificationPayload,
  NotificationDispatchResult,
} from "../domain/notification-dispatcher.port";
import { NotificationChannel } from "@conectajac/shared";

@Injectable()
export class WhatsAppCloudAdapter implements INotificationDispatcher {
  readonly channel = NotificationChannel.WHATSAPP;
  private readonly logger = new Logger(WhatsAppCloudAdapter.name);

  private readonly token = process.env.WHATSAPP_API_TOKEN;
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  private readonly apiUrl = "https://graph.facebook.com/v21.0";

  async send(payload: SendNotificationPayload): Promise<NotificationDispatchResult> {
    if (!this.token || !this.phoneNumberId) {
      this.logger.warn("WhatsApp Cloud API credentials not configured. Simulating send.");
      return {
        success: true,
        messageId: `sim-wa-${Date.now()}`,
      };
    }

    try {
      // Normalizar número a formato internacional (Colombia +57)
      let phone = payload.to.replace(/\D/g, "");
      if (phone.length === 10 && phone.startsWith("3")) {
        phone = `57${phone}`;
      }

      let requestBody: Record<string, unknown>;

      if (payload.templateId) {
        requestBody = {
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: payload.templateId,
            language: { code: "es" },
            components: payload.templateParams
              ? [
                  {
                    type: "body",
                    parameters: payload.templateParams.map((p) => ({
                      type: "text",
                      text: p,
                    })),
                  },
                ]
              : [],
          },
        };
      } else {
        requestBody = {
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: {
            body: `*${payload.title}*\n\n${payload.body}`,
          },
        };
      }

      const response = await fetch(`${this.apiUrl}/${this.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = (await response.json()) as { messages?: Array<{ id: string }>; error?: { message: string } };

      if (!response.ok) {
        this.logger.error(`Error enviando WhatsApp: ${data.error?.message || response.statusText}`);
        return {
          success: false,
          error: data.error?.message || "Error al enviar mensaje de WhatsApp",
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error) {
      this.logger.error(`Fallo en adaptador de WhatsApp: ${(error as Error).message}`);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}

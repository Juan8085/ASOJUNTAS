import { NotificationChannel } from "@conectajac/shared";

export interface SendNotificationPayload {
  to: string; // Número de teléfono E.164 para WhatsApp/SMS o Push Token para Expo
  title: string;
  body: string;
  data?: Record<string, unknown>;
  templateId?: string;       // Plantilla oficial aprobada de WhatsApp Cloud API
  templateParams?: string[]; // Variables para reemplazo en plantilla
}

export interface NotificationDispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Puerto de Notificaciones Multicanal (Hexagonal Architecture)
 * Adaptable a WhatsApp Business Cloud API, Expo Push Notifications y FCM
 */
export interface INotificationDispatcher {
  readonly channel: NotificationChannel;
  send(payload: SendNotificationPayload): Promise<NotificationDispatchResult>;
}

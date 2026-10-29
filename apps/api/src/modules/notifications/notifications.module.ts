import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { WhatsAppCloudAdapter } from "./infrastructure/whatsapp-cloud.adapter";
import { ExpoPushAdapter } from "./infrastructure/expo-push.adapter";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, WhatsAppCloudAdapter, ExpoPushAdapter],
  exports: [NotificationsService, WhatsAppCloudAdapter, ExpoPushAdapter],
})
export class NotificationsModule {}

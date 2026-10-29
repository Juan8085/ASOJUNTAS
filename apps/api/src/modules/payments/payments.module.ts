import { Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { WompiGatewayAdapter } from "./infrastructure/wompi.adapter";

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, WompiGatewayAdapter],
  exports: [PaymentsService, WompiGatewayAdapter],
})
export class PaymentsModule {}

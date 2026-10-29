import { Module } from "@nestjs/common";
import { AffiliatesService } from "./affiliates.service";
import { AffiliatesController } from "./affiliates.controller";

@Module({
  controllers: [AffiliatesController],
  providers: [AffiliatesService],
  exports: [AffiliatesService],
})
export class AffiliatesModule {}


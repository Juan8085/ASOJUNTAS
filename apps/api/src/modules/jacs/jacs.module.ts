import { Module } from "@nestjs/common";
import { JacsService } from "./jacs.service";
import { JacsController } from "./jacs.controller";

@Module({
  controllers: [JacsController],
  providers: [JacsService],
  exports: [JacsService],
})
export class JacsModule {}

import { Module } from "@nestjs/common";
import { PqrsdService } from "./pqrsd.service";
import { PqrsdController } from "./pqrsd.controller";

@Module({
  controllers: [PqrsdController],
  providers: [PqrsdService],
  exports: [PqrsdService],
})
export class PqrsdModule {}


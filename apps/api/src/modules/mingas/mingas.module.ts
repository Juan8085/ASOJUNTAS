import { Module } from "@nestjs/common";
import { MingasService } from "./mingas.service";
import { MingasController } from "./mingas.controller";

@Module({
  controllers: [MingasController],
  providers: [MingasService],
  exports: [MingasService],
})
export class MingasModule {}

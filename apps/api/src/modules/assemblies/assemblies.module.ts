import { Module } from "@nestjs/common";
import { AssembliesService } from "./assemblies.service";
import { AssembliesController } from "./assemblies.controller";

@Module({
  controllers: [AssembliesController],
  providers: [AssembliesService],
  exports: [AssembliesService],
})
export class AssembliesModule {}


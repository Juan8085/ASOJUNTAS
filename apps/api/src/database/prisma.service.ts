import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient, withTenantContext } from "@conectajac/database";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("Conectado exitosamente a PostgreSQL (Prisma)");
    } catch (error) {
      this.logger.warn(`Conexión diferida a PostgreSQL (Prisma): ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("Desconectado de PostgreSQL (Prisma)");
  }

  /**
   * Helper para ejecutar consultas aplicando el contexto de Row-Level Security (RLS) en PostgreSQL
   */
  async withTenant<T>(
    tenantId: string | null,
    isSuperAdmin: boolean,
    fn: (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => Promise<T>
  ): Promise<T> {
    return withTenantContext(tenantId, isSuperAdmin, fn);
  }
}

import { PrismaClient } from "@prisma/client";

declare const process: any;

export * from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

/**
 * Helper para ejecutar consultas aplicando contexto multi-tenant en ConectaJAC (MongoDB / Prisma)
 */
export async function withTenantContext<T>(
  _tenantId: string | null,
  _isSuperAdmin: boolean,
  fn: (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => Promise<T>
): Promise<T> {
  // En MongoDB, el aislamiento se gestiona a nivel de aplicación mediante filtros por tenantId (jacId)
  return fn(prisma as unknown as Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">);
}

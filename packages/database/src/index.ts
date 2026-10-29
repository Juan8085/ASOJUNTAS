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
 * Helper para ejecutar consultas aplicando el contexto de Row-Level Security (RLS) en PostgreSQL
 * Inyecta las variables de sesión 'app.current_tenant_id' y 'app.is_super_admin'
 */
export async function withTenantContext<T>(
  tenantId: string | null,
  isSuperAdmin: boolean,
  fn: (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    if (tenantId) {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}';`);
    } else {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '';`);
    }

    await tx.$executeRawUnsafe(`SET LOCAL app.is_super_admin = '${isSuperAdmin ? "true" : "false"}';`);

    return fn(tx as unknown as Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">);
  });
}

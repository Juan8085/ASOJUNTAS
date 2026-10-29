import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException
} from "@nestjs/common";
import { UserJwtPayload, UserRole } from "@conectajac/shared";

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = ctxToRequest(context);
    const user = request.user as UserJwtPayload | undefined;

    // Header explícito enviado por el cliente web o móvil
    const headerTenantId = request.headers["x-tenant-id"] as string | undefined;

    // Determinar tenant preferido
    const targetTenantId = headerTenantId || user?.currentJacId;

    // Si el usuario es SUPER_ADMIN (Asojuntas), puede operar sin tenant o asumir cualquiera
    const isSuperAdmin = user?.roles.some((r) => r.role === UserRole.SUPER_ADMIN);
    request.isSuperAdmin = Boolean(isSuperAdmin);

    if (isSuperAdmin) {
      request.tenantId = targetTenantId || null;
      return true;
    }

    // Para usuarios normales o administradores de JAC, el tenant es obligatorio
    if (!targetTenantId) {
      throw new BadRequestException("El contexto de la JAC (x-tenant-id) es requerido para esta operación");
    }

    // Verificar que el usuario pertenezca a la JAC especificada
    const hasMembership = user?.roles.some((r) => r.jacId === targetTenantId);
    if (!hasMembership) {
      throw new ForbiddenException("No tiene permisos para acceder a los datos de esta JAC");
    }

    request.tenantId = targetTenantId;
    return true;
  }
}

function ctxToRequest(context: ExecutionContext) {
  return context.switchToHttp().getRequest();
}

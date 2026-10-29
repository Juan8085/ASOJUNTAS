import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { UserRole, UserJwtPayload } from "@conectajac/shared";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as UserJwtPayload | undefined;

    if (!user || !user.roles) {
      throw new ForbiddenException("No se encontró información de autenticación o roles");
    }

    // Super Admin de Asojuntas tiene acceso irrestricto
    const isSuperAdmin = user.roles.some((r) => r.role === UserRole.SUPER_ADMIN);
    if (isSuperAdmin) {
      return true;
    }

    const activeJacId = request.tenantId || user.currentJacId;

    // Verificar si el usuario tiene al menos uno de los roles requeridos para la JAC activa
    const hasRole = user.roles.some((r) => {
      const matchRole = requiredRoles.includes(r.role as UserRole);
      if (!matchRole) return false;
      // Si no hay jacId asociado en el rol, aplica globalmente; si hay jacId, debe coincidir con la JAC activa
      return !r.jacId || r.jacId === activeJacId;
    });

    if (!hasRole) {
      throw new ForbiddenException("No cuenta con los roles requeridos para ejecutar esta acción");
    }

    return true;
  }
}


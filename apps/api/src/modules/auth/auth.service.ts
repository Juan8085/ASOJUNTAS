import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../database/prisma.service";
import {
  LoginInput,
  RegisterCitizenInput,
  UserJwtPayload,
  UserRole,
  MembershipStatus,
} from "@conectajac/shared";

@Injectable()
export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET || "conectajac-secret-jwt-key-local-2026";
  private readonly refreshSecret = process.env.JWT_REFRESH_SECRET || "conectajac-refresh-secret-jwt-key-2026";

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  /**
   * Autenticación unificada para Super Admin, Directivos de JAC y Ciudadanos
   */
  async login(input: LoginInput) {
    const { identifier, password, jacId } = input;

    // Buscar por documento o por correo electrónico
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { identificationNumber: identifier },
          { email: identifier.toLowerCase() },
        ],
      },
      include: {
        memberships: {
          include: {
            jac: {
              select: {
                id: true,
                name: true,
                veredaOrBarrio: true,
                logoUrl: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Esta cuenta de usuario ha sido desactivada");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    // Identificar roles y contextos JAC
    const roles = user.memberships.map((m) => ({
      jacId: m.jacId,
      role: m.role,
    }));

    // Determinar JAC activa
    let targetJacId: string | undefined = undefined;

    if (jacId) {
      const matchingMembership = user.memberships.find((m) => m.jacId === jacId);
      const isSuperAdmin = roles.some((r) => r.role === UserRole.SUPER_ADMIN);

      if (!matchingMembership && !isSuperAdmin) {
        throw new UnauthorizedException("No está afiliado ni posee rol en la JAC indicada");
      }
      targetJacId = jacId;
    } else if (user.memberships.length > 0) {
      // Tomar la primera membresía activa por defecto
      const activeMembership = user.memberships.find(
        (m) => m.status === MembershipStatus.ACTIVE && m.jac.isActive
      );
      targetJacId = activeMembership?.jacId ?? user.memberships[0]?.jacId;
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email ?? undefined,
      phone: user.phone,
      roles,
      currentJacId: targetJacId,
    });

    return {
      user: {
        id: user.id,
        identificationType: user.identificationType,
        identificationNumber: user.identificationNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
      },
      memberships: user.memberships.map((m) => ({
        id: m.id,
        jacId: m.jacId,
        jacName: m.jac.name,
        role: m.role,
        status: m.status,
        bookNumber: m.bookNumber,
        folioNumber: m.folioNumber,
      })),
      currentJacId: targetJacId,
      tokens,
    };
  }

  /**
   * Registro público de habitante/ciudadano con afiliación automática en el Libro Digital
   */
  async registerCitizen(input: RegisterCitizenInput) {
    // 1. Validar unicidad de documento y correo
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { identificationNumber: input.identificationNumber },
          ...(input.email ? [{ email: input.email.toLowerCase() }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.identificationNumber === input.identificationNumber) {
        throw new ConflictException("Ya existe un usuario con este número de identificación");
      }
      if (input.email && existingUser.email?.toLowerCase() === input.email.toLowerCase()) {
        throw new ConflictException("El correo electrónico ya se encuentra registrado");
      }
    }

    // 2. Validar que la JAC exista y esté activa
    const jac = await this.prisma.jac.findUnique({
      where: { id: input.jacId },
    });

    if (!jac || !jac.isActive) {
      throw new BadRequestException("La Junta de Acción Comunal no existe o no está activa");
    }

    // 3. Obtener el siguiente número de folio en el libro digital de esta JAC (Ley 2166/2021)
    const lastMembership = await this.prisma.jacMembership.findFirst({
      where: { jacId: input.jacId, bookNumber: 1 },
      orderBy: { folioNumber: "desc" },
      select: { folioNumber: true },
    });
    const nextFolioNumber = (lastMembership?.folioNumber ?? 0) + 1;

    // 4. Hashear contraseña
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 5. Crear usuario y membresía en una transacción atómica
    const result = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          identificationType: input.identificationType,
          identificationNumber: input.identificationNumber,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: input.email ? input.email.toLowerCase().trim() : null,
          phone: input.phone.trim(),
          birthDate: input.birthDate ? new Date(input.birthDate) : null,
          gender: input.gender,
          passwordHash,
          isActive: true,
        },
      });

      const membership = await tx.jacMembership.create({
        data: {
          jacId: input.jacId,
          userId: newUser.id,
          role: UserRole.CITIZEN,
          status: MembershipStatus.ACTIVE,
          bookNumber: 1,
          folioNumber: nextFolioNumber,
          affiliationDate: new Date(),
          address: input.address.trim(),
          veredaOrBarrio: input.veredaOrBarrio.trim(),
        },
      });

      return { newUser, membership };
    });

    // 6. Generar tokens de sesión
    const roles = [{ jacId: input.jacId, role: UserRole.CITIZEN }];
    const tokens = await this.generateTokens({
      sub: result.newUser.id,
      email: result.newUser.email ?? undefined,
      phone: result.newUser.phone,
      roles,
      currentJacId: input.jacId,
    });

    return {
      message: "Registro y afiliación comunal completados con éxito",
      user: {
        id: result.newUser.id,
        identificationType: result.newUser.identificationType,
        identificationNumber: result.newUser.identificationNumber,
        firstName: result.newUser.firstName,
        lastName: result.newUser.lastName,
        email: result.newUser.email,
        phone: result.newUser.phone,
      },
      affiliation: {
        jacId: input.jacId,
        jacName: jac.name,
        bookNumber: result.membership.bookNumber,
        folioNumber: result.membership.folioNumber,
        role: result.membership.role,
        status: result.membership.status,
      },
      tokens,
    };
  }

  /**
   * Renovación de token de acceso mediante refresh token
   */
  async refreshToken(refreshToken: string) {
    try {
      const decoded = await this.jwtService.verifyAsync<{ sub: string; tokenType: string }>(
        refreshToken,
        { secret: this.refreshSecret }
      );

      if (decoded.tokenType !== "refresh") {
        throw new UnauthorizedException("Token inválido para renovación");
      }

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: {
          memberships: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException("Usuario inexistente o inactivo");
      }

      const roles = user.memberships.map((m) => ({
        jacId: m.jacId,
        role: m.role,
      }));

      const activeJacId = user.memberships[0]?.jacId;

      const tokens = await this.generateTokens({
        sub: user.id,
        email: user.email ?? undefined,
        phone: user.phone,
        roles,
        currentJacId: activeJacId,
      });

      return tokens;
    } catch {
      throw new UnauthorizedException("Refresh token expirado o inválido");
    }
  }

  /**
   * Perfil del usuario autenticado
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            jac: {
              select: {
                id: true,
                name: true,
                veredaOrBarrio: true,
                legalPersonhoodNumber: true,
                nit: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return {
      id: user.id,
      identificationType: user.identificationType,
      identificationNumber: user.identificationNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      birthDate: user.birthDate,
      gender: user.gender,
      avatarUrl: user.avatarUrl,
      memberships: user.memberships.map((m) => ({
        id: m.id,
        jac: m.jac,
        role: m.role,
        status: m.status,
        bookNumber: m.bookNumber,
        folioNumber: m.folioNumber,
        affiliationDate: m.affiliationDate,
        veredaOrBarrio: m.veredaOrBarrio,
        address: m.address,
      })),
    };
  }

  /**
   * Emisión de par de tokens (Access 15m + Refresh 7d)
   */
  private async generateTokens(payload: UserJwtPayload) {
    const accessToken = await this.jwtService.signAsync(payload as any, {
      secret: this.jwtSecret,
      expiresIn: "15m" as any,
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: payload.sub, tokenType: "refresh" } as any,
      {
        secret: this.refreshSecret,
        expiresIn: "7d" as any,
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutos en segundos
    };
  }
}


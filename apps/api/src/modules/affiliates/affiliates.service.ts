import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service";
import {
  UserRole,
  MembershipStatus,
  IdentificationType,
} from "@conectajac/shared";

interface ManualEnrollInput {
  identificationType: IdentificationType;
  identificationNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address: string;
  veredaOrBarrio: string;
  occupation?: string;
  hasLandOrFarm?: boolean;
  farmName?: string;
  observations?: string;
  role?: UserRole;
}

@Injectable()
export class AffiliatesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Consulta paginada del Libro Digital de Afiliados de la JAC (Ley 2166/2021)
   */
  async getBook(
    jacId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: MembershipStatus;
      role?: UserRole;
    }
  ) {
    const page = Math.max(1, query.page ? Number(query.page) : 1);
    const limit = Math.max(1, Math.min(100, query.limit ? Number(query.limit) : 20));
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      jacId,
      ...(query.status && { status: query.status }),
      ...(query.role && { role: query.role }),
    };

    if (query.search) {
      whereClause.OR = [
        { user: { identificationNumber: { contains: query.search, mode: "insensitive" } } },
        { user: { firstName: { contains: query.search, mode: "insensitive" } } },
        { user: { lastName: { contains: query.search, mode: "insensitive" } } },
        { veredaOrBarrio: { contains: query.search, mode: "insensitive" } },
        { farmName: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.jacMembership.count({ where: whereClause }),
      this.prisma.jacMembership.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              identificationType: true,
              identificationNumber: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              birthDate: true,
              gender: true,
            },
          },
        },
        orderBy: [{ bookNumber: "asc" }, { folioNumber: "asc" }],
        skip,
        take: limit,
      }),
    ]);

    return {
      data: items.map((item) => ({
        membershipId: item.id,
        user: item.user,
        bookNumber: item.bookNumber,
        folioNumber: item.folioNumber,
        affiliationDate: item.affiliationDate,
        disaffiliationDate: item.disaffiliationDate,
        disaffiliationReason: item.disaffiliationReason,
        role: item.role,
        status: item.status,
        address: item.address,
        veredaOrBarrio: item.veredaOrBarrio,
        occupation: item.occupation,
        hasLandOrFarm: item.hasLandOrFarm,
        farmName: item.farmName,
        observations: item.observations,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Detalle individual de una entrada del libro
   */
  async getEntryById(jacId: string, membershipId: string) {
    const entry = await this.prisma.jacMembership.findFirst({
      where: { id: membershipId, jacId },
      include: {
        user: true,
        jac: {
          select: {
            id: true,
            name: true,
            legalPersonhoodNumber: true,
            nit: true,
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException("Registro de afiliación no encontrado");
    }

    return entry;
  }

  /**
   * Registro manual custodiado por el Secretario(a) o Presidente de la JAC
   */
  async manualEnroll(jacId: string, input: ManualEnrollInput) {
    const jac = await this.prisma.jac.findUnique({
      where: { id: jacId },
    });

    if (!jac || !jac.isActive) {
      throw new BadRequestException("Junta de Acción Comunal no válida");
    }

    // Buscar si el usuario ya existe
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { identificationNumber: input.identificationNumber },
          ...(input.email ? [{ email: input.email.toLowerCase() }] : []),
        ],
      },
    });

    // Si ya existe, verificar si ya está afiliado a esta JAC
    if (user) {
      const existingMembership = await this.prisma.jacMembership.findUnique({
        where: {
          jacId_userId: {
            jacId,
            userId: user.id,
          },
        },
      });

      if (existingMembership) {
        throw new ConflictException(
          `Esta persona ya se encuentra afiliada a la JAC en el Folio #${existingMembership.folioNumber}`
        );
      }
    }

    // Obtener siguiente número de folio
    const lastMembership = await this.prisma.jacMembership.findFirst({
      where: { jacId, bookNumber: 1 },
      orderBy: { folioNumber: "desc" },
      select: { folioNumber: true },
    });
    const nextFolioNumber = (lastMembership?.folioNumber ?? 0) + 1;

    // Si el usuario no existe, crearlo con password por defecto (los últimos 6 dígitos del documento)
    return this.prisma.$transaction(async (tx) => {
      if (!user) {
        const defaultPassword = input.identificationNumber.slice(-6);
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        user = await tx.user.create({
          data: {
            identificationType: input.identificationType,
            identificationNumber: input.identificationNumber,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            email: input.email ? input.email.toLowerCase().trim() : null,
            phone: input.phone.trim(),
            passwordHash,
            isActive: true,
          },
        });
      }

      const membership = await tx.jacMembership.create({
        data: {
          jacId,
          userId: user.id,
          role: input.role || UserRole.CITIZEN,
          status: MembershipStatus.ACTIVE,
          bookNumber: 1,
          folioNumber: nextFolioNumber,
          affiliationDate: new Date(),
          address: input.address.trim(),
          veredaOrBarrio: input.veredaOrBarrio.trim(),
          occupation: input.occupation?.trim() || null,
          hasLandOrFarm: input.hasLandOrFarm ?? false,
          farmName: input.farmName?.trim() || null,
          observations: input.observations?.trim() || null,
        },
      });

      return {
        message: "Afiliado inscrito formalmente en el Libro Digital",
        membershipId: membership.id,
        bookNumber: membership.bookNumber,
        folioNumber: membership.folioNumber,
        user: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          identificationNumber: user.identificationNumber,
          phone: user.phone,
        },
      };
    });
  }

  /**
   * Actualizar estado de membresía (Activo, Suspendido, Inactivo, Fallecido)
   */
  async updateStatus(
    jacId: string,
    membershipId: string,
    data: { status: MembershipStatus; reason?: string }
  ) {
    const membership = await this.prisma.jacMembership.findFirst({
      where: { id: membershipId, jacId },
    });

    if (!membership) {
      throw new NotFoundException("Registro de afiliación no encontrado");
    }

    const isDeactivating =
      data.status === MembershipStatus.INACTIVE ||
      data.status === MembershipStatus.SUSPENDED ||
      data.status === MembershipStatus.DECEASED;

    return this.prisma.jacMembership.update({
      where: { id: membershipId },
      data: {
        status: data.status,
        disaffiliationDate: isDeactivating ? new Date() : null,
        disaffiliationReason: isDeactivating ? data.reason || "Decisión Directiva" : null,
      },
    });
  }

  /**
   * Consulta de afiliación para el ciudadano autenticado
   */
  async getMyAffiliation(userId: string, jacId?: string) {
    const memberships = await this.prisma.jacMembership.findMany({
      where: {
        userId,
        ...(jacId && { jacId }),
      },
      include: {
        jac: {
          select: {
            id: true,
            name: true,
            legalPersonhoodNumber: true,
            veredaOrBarrio: true,
            nit: true,
            logoUrl: true,
          },
        },
      },
    });

    return memberships;
  }
}

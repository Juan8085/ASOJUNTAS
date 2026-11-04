import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../database/prisma.service";
import {
  UserRole,
  MembershipStatus,
  IdentificationType,
  ObligationStatus,
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
  latitude?: number;
  longitude?: number;
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
        latitude: item.latitude,
        longitude: item.longitude,
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
   * Estado de cuenta integral del afiliado: cuotas históricas, adelantos y recibos
   */
  async getAffiliateStatement(jacId: string, membershipId: string) {
    const membership = await this.prisma.jacMembership.findFirst({
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

    if (!membership) {
      throw new NotFoundException("Afiliado no encontrado en esta JAC");
    }

    // 1. Obtener todas las obligaciones de cuotas del afiliado (pasadas, actuales y adelantadas)
    const obligations = await this.prisma.userFeeObligation.findMany({
      where: { jacId, userId: membership.userId },
      include: {
        feeConfig: {
          select: { name: true, type: true, amount: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // 2. Obtener todos los pagos/recibos registrados
    const payments = await this.prisma.paymentTransaction.findMany({
      where: { jacId, userId: membership.userId },
      include: {
        treasuryTransactions: {
          include: {
            account: { select: { name: true, type: true } },
            registeredBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
    });

    const now = new Date();
    const currentPeriodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let totalDebt = 0;
    let totalPaidHistorically = 0;
    let overdueCount = 0;
    let advanceCount = 0;

    for (const obl of obligations) {
      const balance = Math.max(0, obl.amount - obl.paidAmount);
      totalDebt += balance;
      totalPaidHistorically += obl.paidAmount;

      if (balance > 0 && (obl.status === ObligationStatus.OVERDUE || new Date(obl.dueDate) < now)) {
        overdueCount++;
      }

      if (obl.status === ObligationStatus.PAID && obl.period > currentPeriodStr) {
        advanceCount++;
      }
    }

    return {
      affiliate: {
        membershipId: membership.id,
        userId: membership.user.id,
        folioNumber: membership.folioNumber,
        bookNumber: membership.bookNumber,
        affiliationDate: membership.affiliationDate,
        role: membership.role,
        status: membership.status,
        observations: membership.observations,
        address: membership.address,
        veredaOrBarrio: membership.veredaOrBarrio,
        occupation: membership.occupation,
        hasLandOrFarm: membership.hasLandOrFarm,
        farmName: membership.farmName,
        latitude: membership.latitude,
        longitude: membership.longitude,
        user: {
          id: membership.user.id,
          firstName: membership.user.firstName,
          lastName: membership.user.lastName,
          fullName: `${membership.user.firstName} ${membership.user.lastName}`,
          identificationType: membership.user.identificationType,
          identificationNumber: membership.user.identificationNumber,
          phone: membership.user.phone,
          email: membership.user.email,
        },
        jac: membership.jac,
      },
      summary: {
        totalDebt,
        totalPaidHistorically,
        isUpToDate: totalDebt === 0,
        overdueCount,
        advanceCount,
        isSeverelyOverdue: overdueCount >= 3,
      },
      obligations: obligations.map((o) => ({
        id: o.id,
        period: o.period,
        feeName: o.feeConfig?.name || "Cuota Comunal",
        feeType: o.feeConfig?.type,
        amount: o.amount,
        paidAmount: o.paidAmount,
        pendingBalance: Math.max(0, o.amount - o.paidAmount),
        dueDate: o.dueDate,
        status: o.status,
        isAdvance: o.status === ObligationStatus.PAID && o.period > currentPeriodStr,
      })),
      payments: payments.map((p) => {
        const metadata = (p.metadata as any) || {};
        const treasury = p.treasuryTransactions[0];
        return {
          id: p.id,
          receiptNumber: p.receiptNumber || `REC-${p.id.slice(-6)}`,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          paidAt: p.paidAt || p.createdAt,
          notes: metadata.notes || "",
          quotasPaidCount: metadata.quotasPaidCount || 0,
          accountName: treasury?.account?.name || metadata.accountName || "Caja / Banco",
          registeredByName: treasury?.registeredBy
            ? `${treasury.registeredBy.firstName} ${treasury.registeredBy.lastName}`
            : "Directivo JAC",
          isAdvance: Boolean(metadata.isAdvance),
          advancePeriods: metadata.advancePeriods || [],
        };
      }),
    };
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
            latitude: input.latitude,
            longitude: input.longitude,
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
          latitude: input.latitude,
          longitude: input.longitude,
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


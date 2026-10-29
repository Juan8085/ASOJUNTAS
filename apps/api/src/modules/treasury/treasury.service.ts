import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreateFeeConfigInput,
  CreateTreasuryAccountInput,
  CreateTreasuryMovementInput,
  MembershipStatus,
  ObligationStatus,
  TreasuryTransactionType,
} from "@conectajac/shared";

@Injectable()
export class TreasuryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear configuración de cuota comunal (ordinaria, extraordinaria, minga)
   */
  async createFeeConfig(input: CreateFeeConfigInput) {
    return this.prisma.feeConfiguration.create({
      data: {
        jacId: input.jacId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        type: input.type,
        periodicity: input.periodicity,
        amount: input.amount,
        dueDateDay: input.dueDateDay,
        isActive: input.active,
      },
    });
  }

  /**
   * Listar cuotas configuradas en la JAC
   */
  async getFeeConfigs(jacId: string) {
    return this.prisma.feeConfiguration.findMany({
      where: { jacId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Generar masivamente obligaciones de cuota para todos los afiliados activos de la JAC
   */
  async generatePeriodObligations(jacId: string, feeConfigId: string, period: string) {
    const feeConfig = await this.prisma.feeConfiguration.findFirst({
      where: { id: feeConfigId, jacId },
    });

    if (!feeConfig) {
      throw new NotFoundException("Configuración de cuota no encontrada");
    }

    // Obtener todos los afiliados activos de la JAC
    const activeMembers = await this.prisma.jacMembership.findMany({
      where: { jacId, status: MembershipStatus.ACTIVE },
      select: { userId: true },
    });

    if (activeMembers.length === 0) {
      return { message: "No hay afiliados activos para generar obligaciones", createdCount: 0 };
    }

    // Calcular fecha límite del periodo
    const dueDate = new Date();
    dueDate.setDate(feeConfig.dueDateDay);

    let createdCount = 0;
    for (const member of activeMembers) {
      try {
        await this.prisma.userFeeObligation.upsert({
          where: {
            jacId_userId_feeConfigId_period: {
              jacId,
              userId: member.userId,
              feeConfigId,
              period,
            },
          },
          update: {},
          create: {
            jacId,
            userId: member.userId,
            feeConfigId,
            period,
            amount: feeConfig.amount,
            paidAmount: 0,
            status: ObligationStatus.PENDING,
            dueDate,
          },
        });
        createdCount++;
      } catch {
        // Ignorar duplicados
      }
    }

    return {
      message: `Obligaciones generadas exitosamente para el periodo ${period}`,
      period,
      createdCount,
    };
  }

  /**
   * Crear cuenta contable en tesorería (Caja, Banco, etc.)
   */
  async createAccount(input: CreateTreasuryAccountInput) {
    return this.prisma.treasuryAccount.create({
      data: {
        jacId: input.jacId,
        name: input.name.trim(),
        type: input.type,
        balance: input.initialBalance ?? 0,
        isActive: true,
      },
    });
  }

  /**
   * Listar cuentas de tesorería y saldos
   */
  async getAccounts(jacId: string) {
    return this.prisma.treasuryAccount.findMany({
      where: { jacId },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Registrar movimiento de tesorería (Ingreso / Egreso) con actualización atómica de balance
   */
  async createMovement(registeredByUserId: string, input: CreateTreasuryMovementInput) {
    const account = await this.prisma.treasuryAccount.findFirst({
      where: { id: input.accountId, jacId: input.jacId },
    });

    if (!account) {
      throw new NotFoundException("Cuenta de tesorería no encontrada");
    }

    const currentBalance = Number(account.balance);
    const amount = Number(input.amount);

    if (input.type === TreasuryTransactionType.EXPENSE && currentBalance < amount) {
      throw new BadRequestException(
        `Saldo insuficiente en la cuenta. Saldo actual: $${currentBalance.toLocaleString()} COP`
      );
    }

    const newBalance =
      input.type === TreasuryTransactionType.INCOME
        ? currentBalance + amount
        : currentBalance - amount;

    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar balance de la cuenta
      await tx.treasuryAccount.update({
        where: { id: account.id },
        data: { balance: newBalance },
      });

      // 2. Registrar asiento contable
      const movement = await tx.treasuryTransaction.create({
        data: {
          jacId: input.jacId,
          accountId: account.id,
          registeredByUserId,
          type: input.type,
          category: input.category,
          amount,
          balanceAfter: newBalance,
          description: input.description.trim(),
          voucherUrl: input.voucherUrl ?? null,
          transactionDate: input.movementDate ? new Date(input.movementDate) : new Date(),
        },
      });

      return {
        movement,
        accountBalance: newBalance,
      };
    });
  }

  /**
   * Consulta paginada del Libro de Tesorería (movimientos contables)
   */
  async getMovements(
    jacId: string,
    query: {
      page?: number;
      limit?: number;
      accountId?: string;
      type?: TreasuryTransactionType;
    }
  ) {
    const page = Math.max(1, query.page ? Number(query.page) : 1);
    const limit = Math.max(1, Math.min(100, query.limit ? Number(query.limit) : 20));
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      jacId,
      ...(query.accountId && { accountId: query.accountId }),
      ...(query.type && { type: query.type }),
    };

    const [total, items] = await Promise.all([
      this.prisma.treasuryTransaction.count({ where: whereClause }),
      this.prisma.treasuryTransaction.findMany({
        where: whereClause,
        include: {
          account: { select: { name: true, type: true } },
          registeredBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { transactionDate: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Resumen financiero de la JAC (Informe para Asamblea General)
   */
  async getFinancialSummary(jacId: string) {
    const accounts = await this.prisma.treasuryAccount.findMany({
      where: { jacId, isActive: true },
    });

    const totalBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance), 0);

    const pendingObligationsCount = await this.prisma.userFeeObligation.count({
      where: { jacId, status: ObligationStatus.PENDING },
    });

    const paidObligationsCount = await this.prisma.userFeeObligation.count({
      where: { jacId, status: ObligationStatus.PAID },
    });

    return {
      totalBalance,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: Number(a.balance),
      })),
      obligationsSummary: {
        pendingCount: pendingObligationsCount,
        paidCount: paidObligationsCount,
        collectionRate:
          pendingObligationsCount + paidObligationsCount > 0
            ? Math.round((paidObligationsCount / (pendingObligationsCount + paidObligationsCount)) * 100)
            : 100,
      },
    };
  }
}

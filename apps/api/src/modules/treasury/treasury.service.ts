import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../database/prisma.service";
import {
  CreateFeeConfigInput,
  UpdateFeeConfigInput,
  CreateTreasuryAccountInput,
  CreateTreasuryMovementInput,
  RegisterAffiliatePaymentInput,
  ImportAffiliatesBulkInput,
  MembershipStatus,
  ObligationStatus,
  PaymentGateway,
  PaymentMethod,
  PaymentStatus,
  TreasuryTransactionType,
  TreasuryCategory,
  FeeType,
  FeePeriodicity,
  UserRole,
} from "@conectajac/shared";

@Injectable()
export class TreasuryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear configuración de cuota comunal (ordinaria, extraordinaria, afiliación)
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
        approvalDate: input.approvalDate ? new Date(input.approvalDate) : null,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        isActive: input.active,
      },
    });
  }

  /**
   * Modificar valor, periodicidad, fecha de aprobación y caducidad de cuota comunal
   */
  async updateFeeConfig(id: string, jacId: string, input: UpdateFeeConfigInput) {
    const existing = await this.prisma.feeConfiguration.findFirst({
      where: { id, jacId },
    });

    if (!existing) {
      throw new NotFoundException("Configuración de cuota no encontrada en esta JAC");
    }

    return this.prisma.feeConfiguration.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name.trim() }),
        ...(input.description !== undefined && { description: input.description?.trim() || null }),
        ...(input.type && { type: input.type }),
        ...(input.periodicity && { periodicity: input.periodicity }),
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.dueDateDay !== undefined && { dueDateDay: input.dueDateDay }),
        ...(input.approvalDate !== undefined && {
          approvalDate: input.approvalDate ? new Date(input.approvalDate) : null,
        }),
        ...(input.expiryDate !== undefined && {
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        }),
        ...(input.active !== undefined && { isActive: input.active }),
      },
    });
  }

  /**
   * Listar cuotas configuradas en la JAC con cálculo de caducidad estatutaria
   */
  async getFeeConfigs(jacId: string) {
    const configs = await this.prisma.feeConfiguration.findMany({
      where: { jacId },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    return configs.map((fee) => {
      let isExpired = false;
      let daysUntilExpiry: number | null = null;
      let isExpiringSoon = false;

      if (fee.expiryDate) {
        const diffMs = fee.expiryDate.getTime() - now.getTime();
        daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        isExpired = daysUntilExpiry <= 0;
        isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 30;
      }

      return {
        ...fee,
        isExpired,
        daysUntilExpiry,
        isExpiringSoon,
      };
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
   * Obtener cartera detallada de todos los afiliados: deuda pendiente, cuotas en mora y estado
   */
  async getAffiliatesPortfolio(jacId: string, search?: string) {
    const members = await this.prisma.jacMembership.findMany({
      where: {
        jacId,
        ...(search
          ? {
              OR: [
                { user: { firstName: { contains: search, mode: "insensitive" } } },
                { user: { lastName: { contains: search, mode: "insensitive" } } },
                { user: { identificationNumber: { contains: search } } },
                { veredaOrBarrio: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            identificationType: true,
            identificationNumber: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { folioNumber: "asc" },
    });

    // Cargar obligaciones pendientes o parcialmente pagadas de la JAC
    const pendingObligations = await this.prisma.userFeeObligation.findMany({
      where: {
        jacId,
        status: { in: [ObligationStatus.PENDING, ObligationStatus.PARTIALLY_PAID, ObligationStatus.OVERDUE] },
      },
      include: {
        feeConfig: {
          select: {
            name: true,
            type: true,
            amount: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const now = new Date();
    const currentPeriodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Cargar obligaciones pagadas con periodos futuros (adelantos)
    const advanceObligations = await this.prisma.userFeeObligation.findMany({
      where: {
        jacId,
        status: ObligationStatus.PAID,
        period: { gt: currentPeriodStr },
      },
      select: {
        userId: true,
        period: true,
      },
      orderBy: { period: "asc" },
    });

    const advancesByUser = new Map<string, string[]>();
    for (const adv of advanceObligations) {
      const list = advancesByUser.get(adv.userId) || [];
      list.push(adv.period);
      advancesByUser.set(adv.userId, list);
    }

    const obligationsByUser = new Map<string, typeof pendingObligations>();
    for (const obl of pendingObligations) {
      const userList = obligationsByUser.get(obl.userId) || [];
      userList.push(obl);
      obligationsByUser.set(obl.userId, userList);
    }

    let totalPortfolioDebt = 0;
    let upToDateCount = 0;
    let inMoraCount = 0;
    let suspendedCount = 0;

    const affiliates = members.map((member) => {
      const userObligations = obligationsByUser.get(member.userId) || [];
      const totalDebt = userObligations.reduce(
        (sum, o) => sum + Math.max(0, o.amount - o.paidAmount),
        0
      );
      totalPortfolioDebt += totalDebt;

      const overdueCount = userObligations.filter(
        (o) => o.status === ObligationStatus.OVERDUE || new Date(o.dueDate) < now
      ).length;

      const isUpToDate = totalDebt === 0;

      if (member.status === MembershipStatus.SUSPENDED) {
        suspendedCount++;
      } else if (isUpToDate) {
        upToDateCount++;
      } else {
        inMoraCount++;
      }

      return {
        membershipId: member.id,
        userId: member.user.id,
        folioNumber: member.folioNumber,
        bookNumber: member.bookNumber,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        fullName: `${member.user.firstName} ${member.user.lastName}`,
        identificationType: member.user.identificationType,
        identificationNumber: member.user.identificationNumber,
        phone: member.user.phone,
        email: member.user.email,
        address: member.address,
        veredaOrBarrio: member.veredaOrBarrio,
        membershipStatus: member.status,
        totalDebt,
        pendingQuotasCount: userObligations.length,
        overdueQuotasCount: overdueCount,
        advanceQuotasCount: (advancesByUser.get(member.userId) || []).length,
        advancePeriods: advancesByUser.get(member.userId) || [],
        isUpToDate,
        isSeverelyOverdue: overdueCount >= 3,
        obligations: userObligations.map((o) => ({
          id: o.id,
          period: o.period,
          feeName: o.feeConfig?.name || "Cuota Comunal",
          feeType: o.feeConfig?.type,
          amount: o.amount,
          paidAmount: o.paidAmount,
          pendingBalance: Math.max(0, o.amount - o.paidAmount),
          dueDate: o.dueDate,
          status: o.status,
        })),
      };
    });

    return {
      summary: {
        totalPortfolioDebt,
        totalAffiliates: members.length,
        upToDateCount,
        inMoraCount,
        suspendedCount,
        advanceCount: advanceObligations.length,
      },
      affiliates,
    };
  }

  /**
   * Registrar pago de cuotas de afiliado (Efectivo o En Cuenta)
   * Aplica valor a cuotas más antiguas primero (FIFO), calcula remanente y actualiza estado de suspensión
   */
  async registerAffiliatePayment(
    registeredByUserId: string,
    input: RegisterAffiliatePaymentInput
  ) {
    const membership = await this.prisma.jacMembership.findFirst({
      where: { jacId: input.jacId, userId: input.userId },
      include: {
        user: true,
      },
    });

    if (!membership) {
      throw new NotFoundException("Afiliado no encontrado en esta JAC");
    }

    const account = await this.prisma.treasuryAccount.findFirst({
      where: { id: input.accountId, jacId: input.jacId },
    });

    if (!account) {
      throw new NotFoundException("Cuenta de tesorería no encontrada en esta JAC");
    }

    // Buscar obligaciones pendientes ordenadas por vencimiento (FIFO)
    const unpaidObligations = await this.prisma.userFeeObligation.findMany({
      where: {
        jacId: input.jacId,
        userId: input.userId,
        status: { in: [ObligationStatus.PENDING, ObligationStatus.PARTIALLY_PAID, ObligationStatus.OVERDUE] },
      },
      orderBy: { dueDate: "asc" },
    });

    const paymentAmount = Number(input.amount);
    let remainingToApply = paymentAmount;
    let quotasPaidCount = 0;
    const updatesToApply: Array<{ id: string; status: ObligationStatus; paidAmount: number }> = [];

    for (const obl of unpaidObligations) {
      if (remainingToApply <= 0) break;
      const debt = obl.amount - obl.paidAmount;
      if (remainingToApply >= debt) {
        remainingToApply -= debt;
        quotasPaidCount++;
        updatesToApply.push({
          id: obl.id,
          status: ObligationStatus.PAID,
          paidAmount: obl.amount,
        });
      } else {
        updatesToApply.push({
          id: obl.id,
          status: ObligationStatus.PARTIALLY_PAID,
          paidAmount: obl.paidAmount + remainingToApply,
        });
        remainingToApply = 0;
      }
    }

    const receiptNumber = input.receiptNumber?.trim() || `REC-${Date.now().toString().slice(-6)}`;
    const newBalance = Number(account.balance) + paymentAmount;

    // 2. Si sobra dinero o el afiliado no tenía deudas, registrar ADELANTO de cuotas futuras
    const advanceObligationsToCreate: Array<{ period: string; amount: number; paidAmount: number; dueDate: Date }> = [];
    let feeConfigForAdvance = await this.prisma.feeConfiguration.findFirst({
      where: { jacId: input.jacId, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    if (!feeConfigForAdvance) {
      feeConfigForAdvance = await this.prisma.feeConfiguration.create({
        data: {
          jacId: input.jacId,
          name: "Cuota Ordinaria Mensual",
          description: "Cuota base estatutaria",
          type: FeeType.ORDINARY,
          periodicity: FeePeriodicity.MONTHLY,
          amount: 5000,
          dueDateDay: 15,
          isActive: true,
        },
      });
    }

    if (remainingToApply > 0) {
      const quotaAmount = feeConfigForAdvance.amount || 5000;

      // Buscar los periodos ya registrados para este usuario para no duplicar
      const existingUserObligations = await this.prisma.userFeeObligation.findMany({
        where: { jacId: input.jacId, userId: input.userId },
        select: { period: true },
      });
      const existingPeriods = new Set(existingUserObligations.map((o) => o.period));

      let curYear = new Date().getFullYear();
      let curMonth = new Date().getMonth(); // 0-based

      while (remainingToApply > 0) {
        const periodStr = `${curYear}-${String(curMonth + 1).padStart(2, "0")}`;
        if (existingPeriods.has(periodStr)) {
          curMonth++;
          if (curMonth > 11) {
            curMonth = 0;
            curYear++;
          }
          continue;
        }

        const applied = Math.min(remainingToApply, quotaAmount);
        const dueDate = new Date(curYear, curMonth, feeConfigForAdvance.dueDateDay || 15);

        advanceObligationsToCreate.push({
          period: periodStr,
          amount: quotaAmount,
          paidAmount: applied,
          dueDate,
        });

        if (applied >= quotaAmount) {
          quotasPaidCount++;
        }
        remainingToApply -= applied;
        existingPeriods.add(periodStr);

        curMonth++;
        if (curMonth > 11) {
          curMonth = 0;
          curYear++;
        }
      }
    }

    const now = new Date();
    const currentPeriodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const realAdvancePeriods = advanceObligationsToCreate
      .filter((a) => a.period > currentPeriodStr)
      .map((a) => a.period);

    const currentMonthPeriods = advanceObligationsToCreate
      .filter((a) => a.period <= currentPeriodStr)
      .map((a) => a.period);

    const isAdvance = realAdvancePeriods.length > 0;

    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar obligaciones canceladas/abonadas
      for (const update of updatesToApply) {
        await tx.userFeeObligation.update({
          where: { id: update.id },
          data: {
            status: update.status,
            paidAmount: update.paidAmount,
          },
        });
      }

      // 1.b Asentar cuotas pagadas por adelanto
      for (const adv of advanceObligationsToCreate) {
        await tx.userFeeObligation.create({
          data: {
            jacId: input.jacId,
            userId: input.userId,
            feeConfigId: feeConfigForAdvance.id,
            period: adv.period,
            amount: adv.amount,
            paidAmount: adv.paidAmount,
            status: adv.paidAmount >= adv.amount ? ObligationStatus.PAID : ObligationStatus.PARTIALLY_PAID,
            dueDate: adv.dueDate,
          },
        });
      }

      // 2. Aumentar balance de la cuenta seleccionada (Caja o Banco)
      await tx.treasuryAccount.update({
        where: { id: account.id },
        data: { balance: newBalance },
      });

      // 3. Crear registro de pago formal
      const paymentTx = await tx.paymentTransaction.create({
        data: {
          idempotencyKey: `MANUAL-${input.jacId}-${input.userId}-${Date.now()}`,
          jacId: input.jacId,
          userId: input.userId,
          amount: paymentAmount,
          currency: "COP",
          gateway: PaymentGateway.MANUAL_CASH,
          paymentMethod: input.paymentMethod as PaymentMethod,
          status: PaymentStatus.APPROVED,
          receiptNumber,
          paidAt: new Date(),
          metadata: {
            notes: input.notes?.trim() || "",
            quotasPaidCount,
            accountId: account.id,
            accountName: account.name,
            isAdvance,
            advancePeriods: realAdvancePeriods,
            currentPeriods: currentMonthPeriods,
          },
        },
      });

      // 4. Asentar en libro de tesorería
      const methodLabel =
        input.paymentMethod === "CASH" ? "Efectivo (Caja General)" : `En Cuenta (${account.name})`;
      let desc = "";
      if (realAdvancePeriods.length > 0 && currentMonthPeriods.length > 0) {
        desc = `Recaudo cuotas comunales (${methodLabel}) - Folio #${membership.folioNumber} ${membership.user.firstName} ${membership.user.lastName} (Mes actual ${currentMonthPeriods.join(", ")} + Adelanto: ${realAdvancePeriods.join(", ")}) - Recibo: ${receiptNumber}`;
      } else if (realAdvancePeriods.length > 0) {
        desc = `Recaudo con adelanto (${methodLabel}) - Folio #${membership.folioNumber} ${membership.user.firstName} ${membership.user.lastName} (${realAdvancePeriods.length} cuotas anticipadas: ${realAdvancePeriods.join(", ")}) - Recibo: ${receiptNumber}`;
      } else {
        desc = `Recaudo cuotas comunales (${methodLabel}) - Folio #${membership.folioNumber} ${membership.user.firstName} ${membership.user.lastName} - Recibo: ${receiptNumber}`;
      }

      const treasuryTx = await tx.treasuryTransaction.create({
        data: {
          jacId: input.jacId,
          accountId: account.id,
          registeredByUserId,
          paymentTransactionId: paymentTx.id,
          type: TreasuryTransactionType.INCOME,
          category: TreasuryCategory.MONTHLY_FEE,
          amount: paymentAmount,
          balanceAfter: newBalance,
          description: desc,
          transactionDate: new Date(),
        },
      });

      // 5. Calcular deuda remanente y verificar si se reactiva de suspensión
      const remainingUnpaid = await tx.userFeeObligation.findMany({
        where: {
          jacId: input.jacId,
          userId: input.userId,
          status: { in: [ObligationStatus.PENDING, ObligationStatus.PARTIALLY_PAID, ObligationStatus.OVERDUE] },
        },
      });

      const remainingDebt = remainingUnpaid.reduce(
        (sum, o) => sum + Math.max(0, o.amount - o.paidAmount),
        0
      );

      const overdueCount = remainingUnpaid.filter(
        (o) => o.status === ObligationStatus.OVERDUE || new Date(o.dueDate) < new Date()
      ).length;

      let memberStatus = membership.status;
      // Si estaba suspendido y ahora tiene menos de 3 cuotas en mora, reactivar a ACTIVO
      if (membership.status === MembershipStatus.SUSPENDED && overdueCount < 3) {
        memberStatus = MembershipStatus.ACTIVE;
        await tx.jacMembership.update({
          where: { id: membership.id },
          data: {
            status: MembershipStatus.ACTIVE,
            observations: "Reactivado automáticamente tras cancelación/abono de cuotas en mora",
          },
        });
      }

      const isUpToDate = remainingDebt === 0;

      let successMsg = "";
      if (realAdvancePeriods.length > 0 && currentMonthPeriods.length > 0) {
        successMsg = `Pago de $${paymentAmount.toLocaleString()} COP registrado. Cubre el mes actual (${currentMonthPeriods.join(", ")}) y adelanta ${realAdvancePeriods.length} cuota(s) futura(s) (${realAdvancePeriods.join(", ")}).`;
      } else if (realAdvancePeriods.length > 0) {
        successMsg = `Pago de $${paymentAmount.toLocaleString()} COP registrado exitosamente. Se aplicó adelanto de ${realAdvancePeriods.length} cuota(s) futura(s) (Periodos: ${realAdvancePeriods.join(", ")}).`;
      } else if (isUpToDate) {
        successMsg = `Pago de $${paymentAmount.toLocaleString()} COP registrado. El afiliado ha quedado al día.`;
      } else {
        successMsg = `Pago registrado ($${paymentAmount.toLocaleString()} COP). Cubre ${quotasPaidCount} cuota(s). Saldo restante: $${remainingDebt.toLocaleString()} COP.`;
      }

      return {
        success: true,
        receiptNumber,
        paidAmount: paymentAmount,
        quotasPaidCount,
        remainingDebt,
        isUpToDate,
        memberStatus,
        newAccountBalance: newBalance,
        movement: treasuryTx,
        message: successMsg,
      };
    });
  }

  /**
   * Listar todos los recibos y pagos de cuotas emitidos en la JAC (Auditoría & Comprobantes)
   */
  async getReceipts(jacId: string, search?: string) {
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: {
        jacId,
        ...(search
          ? {
              OR: [
                { receiptNumber: { contains: search, mode: "insensitive" } },
                { user: { firstName: { contains: search, mode: "insensitive" } } },
                { user: { lastName: { contains: search, mode: "insensitive" } } },
                { user: { identificationNumber: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            identificationType: true,
            identificationNumber: true,
            memberships: {
              where: { jacId },
              select: { folioNumber: true, veredaOrBarrio: true, address: true },
            },
          },
        },
        treasuryTransactions: {
          include: {
            account: { select: { name: true, type: true } },
            registeredBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
    });

    return transactions.map((tx) => {
      const membership = tx.user.memberships[0];
      const treasury = tx.treasuryTransactions[0];
      const metadata = (tx.metadata as any) || {};

      return {
        id: tx.id,
        receiptNumber: tx.receiptNumber || `REC-${tx.id.slice(-6)}`,
        paidAt: tx.paidAt || tx.createdAt,
        amount: tx.amount,
        paymentMethod: tx.paymentMethod,
        status: tx.status,
        notes: metadata.notes || "",
        quotasPaidCount: metadata.quotasPaidCount || 0,
        advancePeriods: metadata.advancePeriods || [],
        isAdvance: Boolean(metadata.isAdvance),
        user: {
          id: tx.user.id,
          fullName: `${tx.user.firstName} ${tx.user.lastName}`,
          identificationType: tx.user.identificationType,
          identificationNumber: tx.user.identificationNumber,
          folioNumber: membership?.folioNumber || 0,
          veredaOrBarrio: membership?.veredaOrBarrio || membership?.address || "",
        },
        accountName: treasury?.account?.name || metadata.accountName || "Caja / Banco",
        registeredByName: treasury?.registeredBy
          ? `${treasury.registeredBy.firstName} ${treasury.registeredBy.lastName}`
          : "Directivo JAC",
      };
    });
  }

  /**
   * Verificar mora de cuotas en toda la JAC: suspender afiliados con 3+ meses impagos
   * conforme a la Ley 2166 de 2021 y reactivar a los que ya no cumplan esa condición
   */
  async checkMorositySuspensions(jacId: string) {
    const activeMembers = await this.prisma.jacMembership.findMany({
      where: { jacId },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    const now = new Date();
    let newlySuspendedCount = 0;
    let newlyReactivatedCount = 0;

    for (const member of activeMembers) {
      const overdueObligationsCount = await this.prisma.userFeeObligation.count({
        where: {
          jacId,
          userId: member.userId,
          status: { in: [ObligationStatus.PENDING, ObligationStatus.PARTIALLY_PAID, ObligationStatus.OVERDUE] },
          dueDate: { lt: now },
        },
      });

      if (overdueObligationsCount >= 3 && member.status === MembershipStatus.ACTIVE) {
        await this.prisma.jacMembership.update({
          where: { id: member.id },
          data: {
            status: MembershipStatus.SUSPENDED,
            observations: `Suspendido por mora en ${overdueObligationsCount} cuotas comunales (Ley 2166 de 2021 - Estatuto)`,
          },
        });
        newlySuspendedCount++;
      } else if (
        overdueObligationsCount < 3 &&
        member.status === MembershipStatus.SUSPENDED &&
        (member.observations?.includes("mora") || member.observations?.includes("cuota"))
      ) {
        await this.prisma.jacMembership.update({
          where: { id: member.id },
          data: {
            status: MembershipStatus.ACTIVE,
            observations: "Reactivado al contar con menos de 3 cuotas en mora",
          },
        });
        newlyReactivatedCount++;
      }
    }

    return {
      success: true,
      newlySuspendedCount,
      newlyReactivatedCount,
      message: `Auditoría comunal completada: ${newlySuspendedCount} afiliado(s) suspendido(s) por 3+ cuotas de mora; ${newlyReactivatedCount} reactivado(s).`,
    };
  }

  /**
   * Importar afiliados masivamente con saldo inicial/cuotas pendientes desde plantilla
   */
  async importAffiliatesBulk(jacId: string, input: ImportAffiliatesBulkInput) {
    let feeConfig = await this.prisma.feeConfiguration.findFirst({
      where: { jacId, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    if (!feeConfig) {
      feeConfig = await this.prisma.feeConfiguration.create({
        data: {
          jacId,
          name: "Cuota Ordinaria Mensual",
          description: "Cuota base comunal estatutaria",
          type: FeeType.ORDINARY,
          periodicity: FeePeriodicity.MONTHLY,
          amount: 5000,
          dueDateDay: 15,
          isActive: true,
        },
      });
    }

    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let suspendedCount = 0;

    for (const item of input.affiliates) {
      processedCount++;
      // 1. Buscar o crear usuario
      let user = await this.prisma.user.findFirst({
        where: { identificationNumber: item.identificationNumber },
      });

      if (!user) {
        const defaultPasswordHash = await bcrypt.hash(item.identificationNumber, 10);
        user = await this.prisma.user.create({
          data: {
            identificationType: item.identificationType,
            identificationNumber: item.identificationNumber,
            firstName: item.firstName.trim(),
            lastName: item.lastName.trim(),
            phone: item.phone.trim(),
            email: item.email?.trim() || null,
            passwordHash: defaultPasswordHash,
          },
        });
        createdCount++;
      }

      // 2. Buscar o crear JacMembership
      let membership = await this.prisma.jacMembership.findFirst({
        where: { jacId, userId: user.id },
      });

      const isSuspendedDueToMora = item.pendingQuotasCount >= 3;
      if (isSuspendedDueToMora) {
        suspendedCount++;
      }

      if (!membership) {
        membership = await this.prisma.jacMembership.create({
          data: {
            jacId,
            userId: user.id,
            bookNumber: 1,
            folioNumber: item.folioNumber,
            address: item.address.trim(),
            veredaOrBarrio: item.veredaOrBarrio.trim(),
            role: UserRole.CITIZEN,
            status: isSuspendedDueToMora ? MembershipStatus.SUSPENDED : MembershipStatus.ACTIVE,
            observations: isSuspendedDueToMora
              ? "Suspendido por mora inicial superior a 3 cuotas comunales (Ley 2166 de 2021)"
              : null,
          },
        });
      } else {
        await this.prisma.jacMembership.update({
          where: { id: membership.id },
          data: {
            folioNumber: item.folioNumber,
            address: item.address.trim(),
            veredaOrBarrio: item.veredaOrBarrio.trim(),
            ...(isSuspendedDueToMora
              ? {
                  status: MembershipStatus.SUSPENDED,
                  observations: "Suspendido por mora inicial superior a 3 cuotas comunales",
                }
              : {}),
          },
        });
        updatedCount++;
      }

      // 3. Crear obligaciones de deuda inicial si reporta cuotas pendientes
      if (item.pendingQuotasCount > 0 || item.pendingAmount > 0) {
        const quotaValue =
          item.pendingAmount > 0 && item.pendingQuotasCount > 0
            ? Math.round(item.pendingAmount / item.pendingQuotasCount)
            : feeConfig.amount;

        const count =
          item.pendingQuotasCount > 0
            ? item.pendingQuotasCount
            : Math.max(1, Math.round(item.pendingAmount / quotaValue));

        for (let i = 1; i <= count; i++) {
          const pastDate = new Date();
          pastDate.setMonth(pastDate.getMonth() - (count - i + 1));
          const periodStr = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, "0")}`;

          try {
            await this.prisma.userFeeObligation.upsert({
              where: {
                jacId_userId_feeConfigId_period: {
                  jacId,
                  userId: user.id,
                  feeConfigId: feeConfig.id,
                  period: periodStr,
                },
              },
              update: {
                amount: quotaValue,
                status: ObligationStatus.OVERDUE,
              },
              create: {
                jacId,
                userId: user.id,
                feeConfigId: feeConfig.id,
                period: periodStr,
                amount: quotaValue,
                paidAmount: 0,
                status: ObligationStatus.OVERDUE,
                dueDate: pastDate,
              },
            });
          } catch {
            // Ignorar duplicados
          }
        }
      }
    }

    return {
      success: true,
      processedCount,
      createdCount,
      updatedCount,
      suspendedCount,
      message: `Procesados ${processedCount} registros: ${createdCount} usuarios nuevos, ${updatedCount} actualizados, ${suspendedCount} en suspensión por mora.`,
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
   * Registrar movimiento general de tesorería (Ingreso / Egreso) con actualización de balance
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
   * Consulta paginada del Libro de Tesorería (movimientos contables generales)
   * Segrega cuotas ordinarias y de afiliación si excludeFees es true
   */
  async getMovements(
    jacId: string,
    query: {
      page?: number;
      limit?: number;
      accountId?: string;
      type?: TreasuryTransactionType;
      excludeFees?: boolean;
    }
  ) {
    const page = Math.max(1, query.page ? Number(query.page) : 1);
    const limit = Math.max(1, Math.min(100, query.limit ? Number(query.limit) : 20));
    const skip = (page - 1) * limit;

    const shouldExcludeFees = query.excludeFees !== false;

    const whereClause: Record<string, unknown> = {
      jacId,
      ...(query.accountId && { accountId: query.accountId }),
      ...(query.type && { type: query.type }),
      ...(shouldExcludeFees
        ? {
            category: {
              notIn: [TreasuryCategory.MONTHLY_FEE, TreasuryCategory.AFFILIATION_FEE],
            },
          }
        : {}),
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

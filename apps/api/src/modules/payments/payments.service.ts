import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "@conectajac/database";
import { WompiGatewayAdapter } from "./infrastructure/wompi.adapter";
import {
  InitPaymentTransactionInput,
  RecordManualPaymentInput,
  PaymentGateway,
  PaymentMethod,
  PaymentStatus,
  ObligationStatus,
  TreasuryAccountType,
  TreasuryTransactionType,
  TreasuryCategory,
} from "@conectajac/shared";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wompiAdapter: WompiGatewayAdapter
  ) {}

  /**
   * Inicia una pasarela de pago para cuotas comunales o pedidos del mercado campesino
   */
  async initiatePayment(userId: string, input: InitPaymentTransactionInput) {
    // 1. Validar idempotencia para prevenir dobles cobros
    const existingTx = await this.prisma.paymentTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });

    if (existingTx) {
      return {
        isExisting: true,
        transactionId: existingTx.id,
        status: existingTx.status,
      };
    }

    // 2. Si se trata de una cuota de tesorería, verificar existencia y estado
    if (input.feeObligationId) {
      const obligation = await this.prisma.userFeeObligation.findUnique({
        where: { id: input.feeObligationId },
        include: { feeConfig: true },
      });

      if (!obligation) {
        throw new NotFoundException("Obligación de cuota comunal no encontrada");
      }

      if (obligation.status === ObligationStatus.PAID) {
        throw new BadRequestException("Esta cuota ya se encuentra totalmente cancelada");
      }
    }

    // 3. Crear registro de transacción con estado PENDING
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        jacId: input.jacId,
        userId,
        feeObligationId: input.feeObligationId ?? null,
        marketOrderId: input.marketOrderId ?? null,
        amount: input.amount,
        currency: input.currency || "COP",
        gateway: input.gateway,
        paymentMethod: input.paymentMethod,
        status: PaymentStatus.PENDING,
      },
    });

    // 4. Delegar al adaptador correspondiente
    if (input.gateway === PaymentGateway.WOMPI) {
      const amountInCents = Math.round(Number(input.amount) * 100);
      const gatewayResponse = await this.wompiAdapter.initiatePayment({
        transactionId: transaction.id,
        idempotencyKey: input.idempotencyKey,
        amountInCents,
        currency: input.currency || "COP",
        payerEmail: input.payerEmail,
        payerPhone: input.payerPhone,
        description: `Pago Cuota Comunal ConectaJAC - Ref: ${transaction.id.slice(0, 8)}`,
        redirectUrl: input.redirectUrl,
      });

      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          gatewayReference: gatewayResponse.gatewayTransactionId,
          metadata: gatewayResponse.rawResponse as Prisma.InputJsonValue,
        },
      });

      return {
        transactionId: transaction.id,
        status: transaction.status,
        checkoutUrl: gatewayResponse.redirectUrl,
      };
    }

    return {
      transactionId: transaction.id,
      status: transaction.status,
    };
  }

  /**
   * Procesa webhooks de pasarelas con validación criptográfica y balance de tesorería
   */
  async handleWebhook(
    gateway: PaymentGateway,
    headers: Record<string, string>,
    body: Record<string, unknown>
  ) {
    if (gateway !== PaymentGateway.WOMPI) {
      throw new BadRequestException(`Pasarela ${gateway} no soportada para webhook`);
    }

    const isValidSignature = this.wompiAdapter.validateWebhookSignature(headers, body);
    if (!isValidSignature && process.env.NODE_ENV === "production") {
      this.logger.warn("Firma de webhook inválida rechazada");
      throw new BadRequestException("Firma de webhook inválida");
    }

    const parsed = this.wompiAdapter.parseWebhookPayload(body);
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: parsed.transactionId },
      include: {
        feeObligation: true,
      },
    });

    if (!transaction) {
      this.logger.warn(`Transacción ${parsed.transactionId} no encontrada`);
      return { received: true, processed: false };
    }

    if (transaction.status === PaymentStatus.APPROVED) {
      return { received: true, alreadyProcessed: true };
    }

    const newStatus =
      parsed.status === "APPROVED"
        ? PaymentStatus.APPROVED
        : parsed.status === "REJECTED"
        ? PaymentStatus.REJECTED
        : PaymentStatus.PENDING;

    await this.prisma.$transaction(async (tx) => {
      // Actualizar transacción de pago
      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: newStatus,
          gatewayTransactionId: parsed.gatewayTransactionId,
          paidAt: newStatus === PaymentStatus.APPROVED ? new Date() : null,
          webhookPayload: parsed.rawPayload as Prisma.InputJsonValue,
        },
      });

      if (newStatus === PaymentStatus.APPROVED) {
        // Actualizar cuota comunal
        if (transaction.feeObligationId) {
          await tx.userFeeObligation.update({
            where: { id: transaction.feeObligationId },
            data: {
              status: ObligationStatus.PAID,
              paidAmount: transaction.amount,
            },
          });
        }

        // Buscar o crear cuenta de tesorería de recaudo digital
        let account = await tx.treasuryAccount.findFirst({
          where: { jacId: transaction.jacId, type: TreasuryAccountType.BANK_CHECKING },
        });

        if (!account) {
          account = await tx.treasuryAccount.create({
            data: {
              jacId: transaction.jacId,
              name: "Recaudo Digital Pasarela",
              type: TreasuryAccountType.BANK_CHECKING,
              balance: 0,
            },
          });
        }

        const newBalance = Number(account.balance) + Number(transaction.amount);

        // Actualizar saldo de cuenta
        await tx.treasuryAccount.update({
          where: { id: account.id },
          data: { balance: newBalance },
        });

        // Asentar movimiento en el Libro de Tesorería
        await tx.treasuryTransaction.create({
          data: {
            jacId: transaction.jacId,
            accountId: account.id,
            registeredByUserId: transaction.userId,
            paymentTransactionId: transaction.id,
            type: TreasuryTransactionType.INCOME,
            category: TreasuryCategory.MONTHLY_FEE,
            amount: transaction.amount,
            balanceAfter: newBalance,
            description: `Recaudo online vía ${parsed.paymentMethod} - Ref: ${transaction.id.slice(0, 8)}`,
          },
        });
      }
    });

    return { received: true, processed: true, status: newStatus };
  }

  /**
   * Registro de recaudo manual en efectivo por el Tesorero en sede o vereda
   */
  async recordManualCashPayment(
    registeredByUserId: string,
    input: RecordManualPaymentInput
  ) {
    const obligation = await this.prisma.userFeeObligation.findUnique({
      where: { id: input.feeObligationId },
      include: {
        user: true,
        feeConfig: true,
      },
    });

    if (!obligation || obligation.jacId !== input.jacId) {
      throw new NotFoundException("Obligación de cuota comunal no encontrada en esta JAC");
    }

    if (obligation.status === ObligationStatus.PAID) {
      throw new BadRequestException("Esta cuota ya se encuentra totalmente cancelada");
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear transacción de pago en efectivo
      const paymentTx = await tx.paymentTransaction.create({
        data: {
          idempotencyKey: `CASH-${input.feeObligationId}-${input.receiptNumber}`,
          jacId: input.jacId,
          userId: obligation.userId,
          feeObligationId: input.feeObligationId,
          amount: input.amount,
          currency: "COP",
          gateway: PaymentGateway.MANUAL_CASH,
          paymentMethod: PaymentMethod.CASH,
          status: PaymentStatus.APPROVED,
          receiptNumber: input.receiptNumber,
          voucherUrl: input.voucherFileUrl ?? null,
          paidAt: new Date(input.paidAt),
          metadata: {
            notes: input.notes,
            registeredByUserId,
          },
        },
      });

      // 2. Marcar obligación como pagada
      await tx.userFeeObligation.update({
        where: { id: input.feeObligationId },
        data: {
          status: ObligationStatus.PAID,
          paidAmount: input.amount,
        },
      });

      // 3. Buscar o crear la cuenta "Caja Menor / Efectivo"
      let cashAccount = await tx.treasuryAccount.findFirst({
        where: { jacId: input.jacId, type: TreasuryAccountType.CASH_BOX },
      });

      if (!cashAccount) {
        cashAccount = await tx.treasuryAccount.create({
          data: {
            jacId: input.jacId,
            name: "Caja Menor Efectivo",
            type: TreasuryAccountType.CASH_BOX,
            balance: 0,
          },
        });
      }

      const newBalance = Number(cashAccount.balance) + Number(input.amount);

      await tx.treasuryAccount.update({
        where: { id: cashAccount.id },
        data: { balance: newBalance },
      });

      // 4. Registrar movimiento contable
      const movement = await tx.treasuryTransaction.create({
        data: {
          jacId: input.jacId,
          accountId: cashAccount.id,
          registeredByUserId,
          paymentTransactionId: paymentTx.id,
          type: TreasuryTransactionType.INCOME,
          category: TreasuryCategory.MONTHLY_FEE,
          amount: input.amount,
          balanceAfter: newBalance,
          description: `Recaudo en efectivo - Recibo #${input.receiptNumber} - ${obligation.user.firstName} ${obligation.user.lastName}`,
          voucherUrl: input.voucherFileUrl ?? null,
        },
      });

      return {
        message: "Recaudo en efectivo registrado y asentado en el Libro de Tesorería",
        receiptNumber: input.receiptNumber,
        paymentTransactionId: paymentTx.id,
        treasuryMovementId: movement.id,
        balanceAfter: newBalance,
      };
    });
  }
}

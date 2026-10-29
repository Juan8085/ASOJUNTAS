import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import {
  IPaymentGatewayAdapter,
  InitiatePaymentParams,
  PaymentGatewayResponse,
  WebhookValidationResult,
} from "../domain/payment-gateway.adapter.port";
import { PaymentGateway, PaymentMethod } from "@conectajac/shared";

@Injectable()
export class WompiGatewayAdapter implements IPaymentGatewayAdapter {
  readonly gatewayName = PaymentGateway.WOMPI;
  private readonly logger = new Logger(WompiGatewayAdapter.name);

  private readonly publicKey = process.env.WOMPI_PUBLIC_KEY || "pub_test_wompi_local";
  private readonly integritySecret = process.env.WOMPI_INTEGRITY_SECRET || "prod_integrity_secret_test";
  private readonly eventsSecret = process.env.WOMPI_EVENTS_SECRET || "events_secret_test";
  private readonly checkoutBaseUrl =
    process.env.WOMPI_CHECKOUT_URL || "https://checkout.wompi.co/p/";

  async initiatePayment(params: InitiatePaymentParams): Promise<PaymentGatewayResponse> {
    const reference = `${params.transactionId}`;
    const amountInCents = params.amountInCents;
    const currency = params.currency || "COP";

    // Generar firma de integridad requerida por Wompi: SHA256(reference + amountInCents + currency + integritySecret)
    const signatureRaw = `${reference}${amountInCents}${currency}${this.integritySecret}`;
    const integritySignature = crypto.createHash("sha256").update(signatureRaw).digest("hex");

    const checkoutUrl = new URL(this.checkoutBaseUrl);
    checkoutUrl.searchParams.set("public-key", this.publicKey);
    checkoutUrl.searchParams.set("currency", currency);
    checkoutUrl.searchParams.set("amount-in-cents", amountInCents.toString());
    checkoutUrl.searchParams.set("reference", reference);
    checkoutUrl.searchParams.set("signature:integrity", integritySignature);
    if (params.redirectUrl) {
      checkoutUrl.searchParams.set("redirect-url", params.redirectUrl);
    }

    return {
      gatewayTransactionId: reference,
      redirectUrl: checkoutUrl.toString(),
      status: "PENDING",
      rawResponse: {
        reference,
        amountInCents,
        currency,
        integritySignature,
        checkoutUrl: checkoutUrl.toString(),
      },
    };
  }

  validateWebhookSignature(headers: Record<string, string>, body: Record<string, unknown>): boolean {
    try {
      const event = body?.event as string;
      const data = body?.data as Record<string, unknown>;
      const signature = body?.signature as Record<string, unknown>;

      if (!data || !signature) {
        return false;
      }

      const checksum = signature.checksum as string;
      const properties = signature.properties as string[];
      const timestamp = body?.timestamp as number;

      if (!checksum || !properties || !timestamp) {
        return false;
      }

      // Concatenar los valores de las propiedades en el orden especificado
      let concatenatedValues = "";
      for (const prop of properties) {
        const parts = prop.split(".");
        let current: unknown = body;
        for (const p of parts) {
          if (current && typeof current === "object") {
            current = (current as Record<string, unknown>)[p];
          }
        }
        concatenatedValues += current !== undefined ? String(current) : "";
      }

      concatenatedValues += timestamp;
      concatenatedValues += this.eventsSecret;

      const calculatedChecksum = crypto.createHash("sha256").update(concatenatedValues).digest("hex");
      return calculatedChecksum.toLowerCase() === checksum.toLowerCase();
    } catch (error) {
      this.logger.error(`Error validando firma de webhook de Wompi: ${(error as Error).message}`);
      return false;
    }
  }

  parseWebhookPayload(body: Record<string, unknown>): WebhookValidationResult {
    const data = (body?.data as Record<string, unknown>)?.transaction as Record<string, unknown>;
    const rawStatus = (data?.status as string) || "PENDING";
    const paymentMethodType = ((data?.payment_method_type as string) || "CARD").toUpperCase();

    let status: "APPROVED" | "REJECTED" | "REFUNDED" | "PENDING" = "PENDING";
    if (rawStatus === "APPROVED") status = "APPROVED";
    else if (rawStatus === "DECLINED" || rawStatus === "ERROR") status = "REJECTED";
    else if (rawStatus === "VOIDED") status = "REFUNDED";

    let paymentMethod: PaymentMethod = PaymentMethod.CREDIT_CARD;
    if (paymentMethodType.includes("PSE")) paymentMethod = PaymentMethod.PSE;
    else if (paymentMethodType.includes("NEQUI")) paymentMethod = PaymentMethod.NEQUI;
    else if (paymentMethodType.includes("BANCOLOMBIA")) paymentMethod = PaymentMethod.BANK_TRANSFER;
    else if (paymentMethodType.includes("DAVIPLATA")) paymentMethod = PaymentMethod.DAVIPLATA;

    return {
      isValid: true,
      transactionId: (data?.reference as string) || "",
      gatewayTransactionId: (data?.id as string) || "",
      status,
      paymentMethod,
      amount: data?.amount_in_cents ? Number(data.amount_in_cents) / 100 : 0,
      rawPayload: body,
    };
  }
}


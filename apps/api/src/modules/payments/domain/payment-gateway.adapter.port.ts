import { PaymentGateway, PaymentMethod } from "@conectajac/shared";

export interface InitiatePaymentParams {
  transactionId: string;
  idempotencyKey: string;
  amountInCents: number;
  currency: string;
  payerEmail: string;
  payerPhone: string;
  description: string;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentGatewayResponse {
  gatewayTransactionId: string;
  redirectUrl?: string;
  qrCodeUrl?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rawResponse: Record<string, unknown>;
}

export interface WebhookValidationResult {
  isValid: boolean;
  transactionId: string;
  gatewayTransactionId: string;
  status: "APPROVED" | "REJECTED" | "REFUNDED" | "PENDING";
  paymentMethod: PaymentMethod;
  amount: number;
  rawPayload: Record<string, unknown>;
}

/**
 * Puerto de Pasarela de Pagos (Patrón Adapter / Strategy)
 * Permite intercambiar o sumar pasarelas locales (Wompi, MercadoPago, ePayco)
 * sin modificar la lógica de dominio o los casos de uso financieros.
 */
export interface IPaymentGatewayAdapter {
  readonly gatewayName: PaymentGateway;
  initiatePayment(params: InitiatePaymentParams): Promise<PaymentGatewayResponse>;
  validateWebhookSignature(headers: Record<string, string>, body: Record<string, unknown>): boolean;
  parseWebhookPayload(body: Record<string, unknown>): WebhookValidationResult;
}

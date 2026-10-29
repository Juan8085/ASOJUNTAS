import { WompiGatewayAdapter } from "./wompi.adapter";
import * as crypto from "crypto";

describe("WompiGatewayAdapter", () => {
  let adapter: WompiGatewayAdapter;

  beforeEach(() => {
    process.env.WOMPI_PUBLIC_KEY = "pub_test_123456";
    process.env.WOMPI_INTEGRITY_SECRET = "secret_integrity_abc";
    process.env.WOMPI_EVENTS_SECRET = "secret_events_xyz";
    adapter = new WompiGatewayAdapter();
  });

  describe("initiatePayment", () => {
    it("debe generar la firma SHA-256 de integridad y retornar la URL de checkout", async () => {
      const params = {
        idempotencyKey: "idem-key-001",
        transactionId: "TXN-001-2026",
        amountInCents: 1500000, // $15.000 COP
        currency: "COP",
        payerEmail: "ciudadano@conectajac.org",
        payerPhone: "+573101234567",
        description: "Cuota ordinaria marzo 2026",
        redirectUrl: "https://conectajac.org/pagos/confirmacion",
      };

      const result = await adapter.initiatePayment(params);

      // Calcular firma esperada: SHA256(reference + amountInCents + currency + integritySecret)
      const expectedRaw = `TXN-001-20261500000COPsecret_integrity_abc`;
      const expectedSig = crypto.createHash("sha256").update(expectedRaw).digest("hex");

      expect(result.status).toBe("PENDING");
      expect(result.redirectUrl).toBeDefined();

      const parsedUrl = new URL(result.redirectUrl!);
      expect(parsedUrl.searchParams.get("public-key")).toBe("pub_test_123456");
      expect(parsedUrl.searchParams.get("amount-in-cents")).toBe("1500000");
      expect(parsedUrl.searchParams.get("reference")).toBe("TXN-001-2026");
      expect(parsedUrl.searchParams.get("signature:integrity")).toBe(expectedSig);
    });
  });

  describe("validateWebhookSignature", () => {
    it("debe validar correctamente un webhook firmado por Wompi", () => {
      const timestamp = 1711756800;
      const status = "APPROVED";
      const id = "12345-wompi";

      // Concatenación según properties: transaction.id + transaction.status + timestamp + eventsSecret
      const rawString = `${id}${status}${timestamp}secret_events_xyz`;
      const expectedChecksum = crypto.createHash("sha256").update(rawString).digest("hex");

      const webhookBody = {
        event: "transaction.updated",
        data: {
          transaction: {
            id,
            status,
          },
        },
        timestamp,
        signature: {
          properties: ["data.transaction.id", "data.transaction.status"],
          checksum: expectedChecksum,
        },
      };

      const isValid = adapter.validateWebhookSignature({}, webhookBody);
      expect(isValid).toBe(true);
    });

    it("debe rechazar un webhook con firma alterada o fraudulenta", () => {
      const webhookBody = {
        event: "transaction.updated",
        data: {
          transaction: {
            id: "12345-wompi",
            status: "APPROVED",
          },
        },
        timestamp: 1711756800,
        signature: {
          properties: ["data.transaction.id", "data.transaction.status"],
          checksum: "checksum_fraudulento_alterado",
        },
      };

      const isValid = adapter.validateWebhookSignature({}, webhookBody);
      expect(isValid).toBe(false);
    });
  });
});

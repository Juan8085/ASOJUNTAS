import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { CertificatesService } from "./certificates.service";
import { PrismaService } from "../../database/prisma.service";
import {
  CertificateType,
  CertificateStatus,
  MembershipStatus,
} from "@conectajac/shared";

describe("CertificatesService", () => {
  let service: CertificatesService;

  const mockMembership = {
    id: "mem-uuid-1",
    userId: "user-uuid-1",
    jacId: "jac-uuid-1",
    role: "CITIZEN",
    status: MembershipStatus.ACTIVE,
    bookNumber: 1,
    folioNumber: 42,
    address: "Finca El Porvenir",
    veredaOrBarrio: "El Salado",
    affiliationDate: new Date("2024-01-15"),
    user: {
      id: "user-uuid-1",
      firstName: "Pedro",
      lastName: "Gómez",
      identificationType: "CC",
      identificationNumber: "1098123456",
    },
    jac: {
      id: "jac-uuid-1",
      name: "JAC Vereda El Salado",
      legalPersonhoodNumber: "PJ-0492",
      nit: "900123456-7",
      veredaOrBarrio: "El Salado",
    },
  };

  const mockPrisma = {
    jacMembership: {
      findFirst: jest.fn(),
    },
    userFeeObligation: {
      count: jest.fn(),
    },
    certificate: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificatesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
  });

  describe("requestCertificate", () => {
    it("debe rechazar la solicitud si el usuario no tiene afiliación activa en la JAC", async () => {
      mockPrisma.jacMembership.findFirst.mockResolvedValue(null);

      await expect(
        service.requestCertificate("user-uuid-1", {
          jacId: "jac-uuid-1",
          type: CertificateType.RESIDENCE,
          purpose: "Trámite de subsidio agrícola",
          deliveryMethod: "DIGITAL_DOWNLOAD",
        })
      ).rejects.toThrow(BadRequestException);
    });

    it("debe rechazar Certificado de Paz y Salvo si el afiliado tiene cuotas en mora", async () => {
      mockPrisma.jacMembership.findFirst.mockResolvedValue(mockMembership);
      mockPrisma.userFeeObligation.count.mockResolvedValue(2); // 2 cuotas pendientes

      await expect(
        service.requestCertificate("user-uuid-1", {
          jacId: "jac-uuid-1",
          type: CertificateType.GOOD_STANDING,
          purpose: "Trámite bancario",
          deliveryMethod: "DIGITAL_DOWNLOAD",
        })
      ).rejects.toThrow(/No se puede emitir el Paz y Salvo/);
    });

    it("debe expedir Certificado de Residencia con QR, token anti-falsificación y 90 días de vigencia", async () => {
      mockPrisma.jacMembership.findFirst.mockResolvedValue(mockMembership);

      const fakeCreatedCert = {
        id: "cert-uuid-1",
        jacId: "jac-uuid-1",
        userId: "user-uuid-1",
        type: CertificateType.RESIDENCE,
        status: CertificateStatus.VALID,
        verificationCode: "JAC-PJ-0492-ABCD",
        qrSecurityToken: "sha256token123",
        issuedAt: new Date(),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        metadata: {},
      };

      mockPrisma.certificate.create.mockResolvedValue(fakeCreatedCert);

      const result = await service.requestCertificate("user-uuid-1", {
        jacId: "jac-uuid-1",
        type: CertificateType.RESIDENCE,
        purpose: "Constancia de vecindad para empleo rural",
        deliveryMethod: "DIGITAL_DOWNLOAD",
      });

      expect(result.certificate).toBeDefined();
      expect(result.certificate.verificationCode).toMatch(/^JAC-PJ-0492-/);
      expect(result.certificate.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(mockPrisma.certificate.create).toHaveBeenCalled();
    });

    it("debe permitir expedir Paz y Salvo si el habitante tiene 0 cuotas en mora", async () => {
      mockPrisma.jacMembership.findFirst.mockResolvedValue(mockMembership);
      mockPrisma.userFeeObligation.count.mockResolvedValue(0); // 0 deudas

      const fakeCreatedCert = {
        id: "cert-uuid-2",
        jacId: "jac-uuid-1",
        userId: "user-uuid-1",
        type: CertificateType.GOOD_STANDING,
        status: CertificateStatus.VALID,
        verificationCode: "JAC-PJ-0492-1234",
        qrSecurityToken: "sha256token456",
        issuedAt: new Date(),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        metadata: {},
      };

      mockPrisma.certificate.create.mockResolvedValue(fakeCreatedCert);

      const result = await service.requestCertificate("user-uuid-1", {
        jacId: "jac-uuid-1",
        type: CertificateType.GOOD_STANDING,
        purpose: "Paz y salvo para asamblea",
        deliveryMethod: "DIGITAL_DOWNLOAD",
      });

      expect(result.certificate).toBeDefined();
      expect(mockPrisma.certificate.create).toHaveBeenCalled();
    });
  });

  describe("verifyCertificate", () => {
    it("debe verificar con éxito un certificado vigente", async () => {
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // vence en 30 días
      mockPrisma.certificate.findUnique.mockResolvedValue({
        id: "cert-1",
        verificationCode: "JAC-PJ-0492-TEST",
        status: CertificateStatus.VALID,
        issuedAt: new Date(),
        validUntil,
        metadata: {
          citizenName: "Pedro Gómez",
          jacName: "JAC Vereda El Salado",
        },
        jac: { name: "JAC Vereda El Salado", legalPersonhoodNumber: "PJ-0492" },
      });

      const verification = await service.verifyCertificate("JAC-PJ-0492-TEST");
      expect(verification.isValid).toBe(true);
      expect(verification.status).toBe(CertificateStatus.VALID);
    });

    it("debe reportar expirado si la fecha actual supera los 90 días de validez", async () => {
      const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // venció hace 10 días
      mockPrisma.certificate.findUnique.mockResolvedValue({
        id: "cert-expired",
        verificationCode: "JAC-PJ-0492-OLD",
        status: CertificateStatus.VALID,
        issuedAt: new Date(),
        validUntil: pastDate,
        metadata: { citizenName: "Pedro Gómez" },
        jac: { name: "JAC Vereda El Salado" },
      });

      const verification = await service.verifyCertificate("JAC-PJ-0492-OLD");
      expect(verification.isValid).toBe(false);
      expect(verification.status).toBe(CertificateStatus.EXPIRED);
    });

    it("debe retornar isValid: false si el código de verificación no existe", async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(null);

      const verification = await service.verifyCertificate("CODIGO-INEXISTENTE");
      expect(verification.isValid).toBe(false);
      expect(verification.status).toBe("NOT_FOUND");
    });
  });
});

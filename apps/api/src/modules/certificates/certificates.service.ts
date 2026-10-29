import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import * as crypto from "crypto";
import * as QRCode from "qrcode";
import { PrismaService } from "../../database/prisma.service";
import {
  RequestCertificateInput,
  CertificateType,
  CertificateStatus,
  MembershipStatus,
  ObligationStatus,
} from "@conectajac/shared";

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Expedición formal de certificado comunal con código verificable y QR
   */
  async requestCertificate(userId: string, input: RequestCertificateInput) {
    // 1. Validar que el usuario esté afiliado y activo en la JAC
    const membership = await this.prisma.jacMembership.findFirst({
      where: {
        userId,
        jacId: input.jacId,
      },
      include: {
        user: true,
        jac: true,
      },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new BadRequestException("El habitante no cuenta con una afiliación activa en esta JAC");
    }

    // 2. Si es Paz y Salvo Comunal, validar que no tenga cuotas pendientes o en mora
    if (input.type === CertificateType.GOOD_STANDING) {
      const pendingObligations = await this.prisma.userFeeObligation.count({
        where: {
          userId,
          jacId: input.jacId,
          status: {
            in: [ObligationStatus.PENDING, ObligationStatus.OVERDUE],
          },
        },
      });

      if (pendingObligations > 0) {
        throw new BadRequestException(
          `No se puede emitir el Paz y Salvo: Registra ${pendingObligations} cuota(s) de tesorería pendiente(s)`
        );
      }
    }

    // 3. Generar código alfanumérico único para verificación física o web
    const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
    const verificationCode = `JAC-${membership.jac.legalPersonhoodNumber}-${randomHex}`;

    // 4. Token criptográfico de seguridad anti-falsificación
    const qrSecurityToken = crypto
      .createHash("sha256")
      .update(`${verificationCode}:${userId}:${input.jacId}:${Date.now()}`)
      .digest("hex");

    // 5. Configurar vigencia legal estándar (90 días calendario)
    const issuedAt = new Date();
    const validUntil = new Date(issuedAt.getTime() + 90 * 24 * 60 * 60 * 1000);

    // 6. Snapshot de metadatos institucionales congelados al momento de expedición
    const metadata = {
      jacName: membership.jac.name,
      legalPersonhoodNumber: membership.jac.legalPersonhoodNumber,
      nit: membership.jac.nit,
      veredaOrBarrio: membership.jac.veredaOrBarrio,
      citizenName: `${membership.user.firstName} ${membership.user.lastName}`,
      identificationType: membership.user.identificationType,
      identificationNumber: membership.user.identificationNumber,
      residenceAddress: membership.address,
      bookNumber: membership.bookNumber,
      folioNumber: membership.folioNumber,
      affiliationDate: membership.affiliationDate.toISOString(),
      purpose: input.purpose,
      type: input.type,
      issuedAt: issuedAt.toISOString(),
      validUntil: validUntil.toISOString(),
    };

    // 7. Generar código QR en Base64 para visualización e impresión
    const qrPayload = JSON.stringify({
      code: verificationCode,
      token: qrSecurityToken.slice(0, 32),
      url: `https://conectajac.gov.co/verify/${verificationCode}`,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 256,
    });

    // 8. Guardar en base de datos
    const certificate = await this.prisma.certificate.create({
      data: {
        jacId: input.jacId,
        userId,
        issuedByUserId: userId, // Auto-solicitado o expedido por directivo
        type: input.type,
        status: CertificateStatus.VALID,
        verificationCode,
        qrSecurityToken,
        purpose: input.purpose.trim(),
        issuedAt,
        validUntil,
        metadata,
      },
    });

    return {
      message: "Certificado emitido exitosamente",
      certificate: {
        id: certificate.id,
        verificationCode: certificate.verificationCode,
        type: certificate.type,
        status: certificate.status,
        issuedAt: certificate.issuedAt,
        validUntil: certificate.validUntil,
        metadata: certificate.metadata,
        qrCodeDataUrl,
      },
    };
  }

  /**
   * Validación pública de autenticidad en tiempo real (PÚBLICO)
   */
  async verifyCertificate(verificationCode: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { verificationCode: verificationCode.trim() },
      include: {
        jac: {
          select: {
            id: true,
            name: true,
            legalPersonhoodNumber: true,
            nit: true,
            veredaOrBarrio: true,
            logoUrl: true,
            officialSealUrl: true,
          },
        },
      },
    });

    if (!certificate) {
      return {
        isValid: false,
        status: "NOT_FOUND",
        message: "El código de verificación no corresponde a ningún certificado comunal emitido",
      };
    }

    const now = new Date();
    const isExpired = certificate.validUntil < now;

    let computedStatus = certificate.status;
    if (certificate.status === CertificateStatus.VALID && isExpired) {
      computedStatus = CertificateStatus.EXPIRED;
    }

    return {
      isValid: computedStatus === CertificateStatus.VALID,
      status: computedStatus,
      verificationCode: certificate.verificationCode,
      issuedAt: certificate.issuedAt,
      validUntil: certificate.validUntil,
      metadata: certificate.metadata,
      jac: certificate.jac,
    };
  }

  /**
   * Obtener todos los certificados emitidos al usuario autenticado
   */
  async getMyCertificates(userId: string, jacId?: string) {
    return this.prisma.certificate.findMany({
      where: {
        userId,
        ...(jacId && { jacId }),
      },
      include: {
        jac: {
          select: {
            id: true,
            name: true,
            veredaOrBarrio: true,
            legalPersonhoodNumber: true,
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    });
  }

  /**
   * Revocación formal de un certificado (exclusivo directivos)
   */
  async revokeCertificate(certificateId: string, jacId: string) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { id: certificateId, jacId },
    });

    if (!certificate) {
      throw new NotFoundException("Certificado no encontrado en esta JAC");
    }

    return this.prisma.certificate.update({
      where: { id: certificateId },
      data: {
        status: CertificateStatus.REVOKED,
      },
    });
  }
}


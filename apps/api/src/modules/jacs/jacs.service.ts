import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../database/prisma.service";
import {
  CreateJacInput,
  UpdateJacSettingsInput,
  UserRole,
  MembershipStatus,
} from "@conectajac/shared";

@Injectable()
export class JacsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registro institucional de una nueva JAC con su administrador inicial
   * Uso exclusivo de Asojuntas / Super Admin
   */
  async createJac(input: CreateJacInput) {
    // 1. Validar unicidad de NIT o código RUP si se proporcionan
    if (input.nit) {
      const existingNit = await this.prisma.jac.findUnique({
        where: { nit: input.nit },
      });
      if (existingNit) {
        throw new ConflictException("Ya existe una JAC registrada con este NIT");
      }
    }

    if (input.codeRup) {
      const existingRup = await this.prisma.jac.findUnique({
        where: { codeRup: input.codeRup },
      });
      if (existingRup) {
        throw new ConflictException("Ya existe una JAC registrada con este Código RUP");
      }
    }

    // 2. Verificar municipio
    const municipality = await this.prisma.municipality.findUnique({
      where: { id: input.municipalityId },
    });
    if (!municipality) {
      throw new BadRequestException("El municipio especificado no existe");
    }

    // 3. Crear JAC y usuario administrador en una transacción atómica
    const passwordHash = await bcrypt.hash(input.adminUser.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const newJac = await tx.jac.create({
        data: {
          municipalityId: input.municipalityId,
          name: input.name.trim(),
          legalPersonhoodNumber: input.legalPersonhoodNumber.trim(),
          nit: input.nit?.trim() || null,
          codeRup: input.codeRup?.trim() || null,
          veredaOrBarrio: input.veredaOrBarrio.trim(),
          address: input.address?.trim() || null,
          phone: input.phone?.trim() || null,
          email: input.email ? input.email.toLowerCase().trim() : null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          isActive: true,
        },
      });

      // Crear o vincular usuario administrador
      let admin = await tx.user.findFirst({
        where: {
          OR: [
            { identificationNumber: input.adminUser.identificationNumber },
            { email: input.adminUser.email.toLowerCase() },
          ],
        },
      });

      if (!admin) {
        admin = await tx.user.create({
          data: {
            identificationType: input.adminUser.identificationType,
            identificationNumber: input.adminUser.identificationNumber,
            firstName: input.adminUser.firstName.trim(),
            lastName: input.adminUser.lastName.trim(),
            email: input.adminUser.email.toLowerCase().trim(),
            phone: input.adminUser.phone.trim(),
            passwordHash,
            isActive: true,
          },
        });
      }

      // Crear membresía como JAC_ADMIN / JAC_PRESIDENT
      const membership = await tx.jacMembership.create({
        data: {
          jacId: newJac.id,
          userId: admin.id,
          role: UserRole.JAC_ADMIN,
          status: MembershipStatus.ACTIVE,
          bookNumber: 1,
          folioNumber: 1, // Folio #1 de la JAC
          affiliationDate: new Date(),
          address: input.address?.trim() || "Sede Comunal",
          veredaOrBarrio: input.veredaOrBarrio.trim(),
          observations: "Directivo Administrador Fundador",
        },
      });

      return {
        message: "Junta de Acción Comunal registrada exitosamente",
        jac: newJac,
        adminUser: {
          id: admin.id,
          name: `${admin.firstName} ${admin.lastName}`,
          email: admin.email,
          role: membership.role,
        },
      };
    });
  }

  /**
   * Catálogo de JACs (Público y filtrable por municipio o vereda)
   */
  async findAll(query?: { municipalityId?: string; search?: string; isActive?: boolean }) {
    const whereClause: Record<string, unknown> = {};

    if (query?.municipalityId) {
      whereClause.municipalityId = query.municipalityId;
    }

    if (query?.isActive !== undefined) {
      whereClause.isActive = query.isActive;
    }

    if (query?.search) {
      whereClause.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { veredaOrBarrio: { contains: query.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.jac.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        veredaOrBarrio: true,
        legalPersonhoodNumber: true,
        nit: true,
        codeRup: true,
        phone: true,
        email: true,
        logoUrl: true,
        primaryColor: true,
        isActive: true,
        municipality: {
          select: {
            id: true,
            name: true,
            department: true,
          },
        },
        _count: {
          select: {
            memberships: {
              where: { status: MembershipStatus.ACTIVE },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Obtener detalle completo de una JAC
   */
  async findById(id: string) {
    const jac = await this.prisma.jac.findUnique({
      where: { id },
      include: {
        municipality: true,
        asojuntas: true,
        memberships: {
          where: {
            role: {
              in: [
                UserRole.JAC_PRESIDENT,
                UserRole.JAC_VICE_PRESIDENT,
                UserRole.JAC_SECRETARY,
                UserRole.JAC_TREASURER,
                UserRole.JAC_FISCAL,
                UserRole.JAC_ADMIN,
              ],
            },
            status: MembershipStatus.ACTIVE,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            memberships: true,
            certificates: true,
            posts: true,
          },
        },
      },
    });

    if (!jac) {
      throw new NotFoundException("Junta de Acción Comunal no encontrada");
    }

    return jac;
  }

  /**
   * Actualizar configuración institucional y bancaria de la JAC
   */
  async updateSettings(id: string, input: UpdateJacSettingsInput) {
    const jac = await this.prisma.jac.findUnique({
      where: { id },
    });

    if (!jac) {
      throw new NotFoundException("Junta de Acción Comunal no encontrada");
    }

    return this.prisma.jac.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name.trim() }),
        ...(input.nit && { nit: input.nit.trim() }),
        ...(input.address && { address: input.address.trim() }),
        ...(input.phone && { phone: input.phone.trim() }),
        ...(input.email && { email: input.email.toLowerCase().trim() }),
        ...(input.logoUrl && { logoUrl: input.logoUrl }),
        ...(input.officialSealUrl && { officialSealUrl: input.officialSealUrl }),
        ...(input.primaryColor && { primaryColor: input.primaryColor }),
        ...(input.bankAccounts && { bankAccounts: input.bankAccounts }),
      },
    });
  }

  /**
   * Listar todos los municipios registrados
   */
  async listMunicipalities() {
    return this.prisma.municipality.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { jacs: true },
        },
      },
    });
  }

  /**
   * Métricas y censo comunal consolidado para Asojuntas (Super Admin)
   */
  async getAsojuntasOverview(municipalityId?: string) {
    const jacWhere: Record<string, unknown> = {};
    if (municipalityId) {
      jacWhere.municipalityId = municipalityId;
    }

    const [totalJacs, activeJacs, totalAffiliates, totalCertificates, totalPosts] = await Promise.all([
      this.prisma.jac.count({ where: jacWhere }),
      this.prisma.jac.count({ where: { ...jacWhere, isActive: true } }),
      this.prisma.jacMembership.count({
        where: {
          status: MembershipStatus.ACTIVE,
          ...(municipalityId && { jac: { municipalityId } }),
        },
      }),
      this.prisma.certificate.count({
        where: {
          ...(municipalityId && { jac: { municipalityId } }),
        },
      }),
      this.prisma.post.count({
        where: {
          ...(municipalityId && { jac: { municipalityId } }),
        },
      }),
    ]);

    return {
      totalJacs,
      activeJacs,
      inactiveJacs: totalJacs - activeJacs,
      totalAffiliates,
      totalCertificates,
      totalPosts,
    };
  }
}


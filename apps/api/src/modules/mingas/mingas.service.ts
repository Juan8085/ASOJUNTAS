import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreatePostInput,
  MingaAttendanceInput,
  PostType,
  PostScope,
  FeeType,
  FeePeriodicity,
  ObligationStatus,
  MembershipStatus,
} from "@conectajac/shared";

@Injectable()
export class MingasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convocatoria comunal a Minga / Trabajo Comunitario (Veredal o Barrial)
   */
  async createMinga(authorUserId: string, input: CreatePostInput) {
    if (!input.jacId) {
      throw new BadRequestException("El identificador de la JAC es requerido para convocar una minga");
    }

    if (!input.eventDate) {
      throw new BadRequestException("La fecha de realización del trabajo comunitario es obligatoria");
    }

    // Generar slug amigable para la minga
    const timestamp = Date.now().toString().slice(-6);
    const slug = `${input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")}-${timestamp}`;

    return this.prisma.post.create({
      data: {
        jacId: input.jacId,
        authorUserId,
        scope: input.scope || PostScope.JAC_LOCAL,
        type: PostType.COMMUNAL_WORK,
        priority: input.priority,
        title: input.title.trim(),
        slug,
        content: input.content.trim(),
        excerpt: input.excerpt?.trim() || null,
        coverImageUrl: input.coverImageUrl ?? null,
        eventDate: new Date(input.eventDate),
        location: input.location?.trim() || "Sede / Vía principal de la vereda",
        requiresAttendanceConfirmation: true,
        isPublished: true,
      },
    });
  }

  /**
   * Confirmación o justificación de asistencia por parte del habitante
   */
  async confirmAttendance(
    userId: string,
    jacId: string,
    input: MingaAttendanceInput
  ) {
    const post = await this.prisma.post.findFirst({
      where: { id: input.postId, jacId, type: PostType.COMMUNAL_WORK },
    });

    if (!post) {
      throw new NotFoundException("Convocatoria a minga no encontrada");
    }

    return this.prisma.mingaAttendance.upsert({
      where: {
        postId_userId: {
          postId: input.postId,
          userId,
        },
      },
      update: {
        attending: input.attending,
        notes: input.notes?.trim() || null,
        confirmedAt: new Date(),
      },
      create: {
        postId: input.postId,
        userId,
        jacId,
        attending: input.attending,
        notes: input.notes?.trim() || null,
      },
    });
  }

  /**
   * Verificación presencial de asistencia en territorio por el directivo / capataz
   */
  async recordAttendance(
    jacId: string,
    postId: string,
    verifiedAttendees: Array<{ userId: string; attended: boolean; notes?: string }>
  ) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, jacId, type: PostType.COMMUNAL_WORK },
    });

    if (!post) {
      throw new NotFoundException("Convocatoria a minga no encontrada");
    }

    const updates = verifiedAttendees.map((att) =>
      this.prisma.mingaAttendance.upsert({
        where: {
          postId_userId: {
            postId,
            userId: att.userId,
          },
        },
        update: {
          attended: att.attended,
          ...(att.notes && { notes: att.notes.trim() }),
        },
        create: {
          postId,
          userId: att.userId,
          jacId,
          attending: att.attended,
          attended: att.attended,
          notes: att.notes?.trim() || null,
        },
      })
    );

    await Promise.all(updates);

    return {
      message: "Planilla de asistencia a la minga registrada con éxito",
      postId,
      totalVerified: verifiedAttendees.length,
      totalAttended: verifiedAttendees.filter((a) => a.attended).length,
    };
  }

  /**
   * Aplicar compensación monetaria por inasistencia no justificada
   * Genera automáticamente una obligación en el módulo de Tesorería
   */
  async applyAbsencePenalties(
    jacId: string,
    postId: string,
    fineAmount: number,
    description?: string
  ) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, jacId, type: PostType.COMMUNAL_WORK },
    });

    if (!post) {
      throw new NotFoundException("Convocatoria a minga no encontrada");
    }

    if (fineAmount <= 0) {
      throw new BadRequestException("El monto de compensación debe ser mayor a cero");
    }

    // 1. Obtener o crear configuración de cuota de compensación de minga
    let feeConfig = await this.prisma.feeConfiguration.findFirst({
      where: { jacId, type: FeeType.COMMUNAL_WORK_FINE, isActive: true },
    });

    if (!feeConfig) {
      feeConfig = await this.prisma.feeConfiguration.create({
        data: {
          jacId,
          name: "Compensación Monetaria por Inasistencia a Minga",
          description: "Establecida en los estatutos comunales para ausencias en trabajos comunitarios",
          type: FeeType.COMMUNAL_WORK_FINE,
          periodicity: FeePeriodicity.ONE_TIME,
          amount: fineAmount,
          dueDateDay: 30,
          isActive: true,
        },
      });
    }

    // 2. Obtener todos los afiliados activos de la JAC
    const allMembers = await this.prisma.jacMembership.findMany({
      where: { jacId, status: MembershipStatus.ACTIVE },
      select: { userId: true },
    });

    // 3. Obtener quienes sí asistieron
    const attendedRecords = await this.prisma.mingaAttendance.findMany({
      where: { postId, jacId, attended: true },
      select: { userId: true },
    });

    const attendedUserIds = new Set(attendedRecords.map((r) => r.userId));

    // 4. Identificar ausentes
    const absentMembers = allMembers.filter((m) => !attendedUserIds.has(m.userId));

    const periodLabel = `MINGA-${postId.slice(0, 8)}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 días para pagar la compensación

    let finesCreated = 0;
    for (const absent of absentMembers) {
      try {
        await this.prisma.userFeeObligation.upsert({
          where: {
            jacId_userId_feeConfigId_period: {
              jacId,
              userId: absent.userId,
              feeConfigId: feeConfig.id,
              period: periodLabel,
            },
          },
          update: {},
          create: {
            jacId,
            userId: absent.userId,
            feeConfigId: feeConfig.id,
            period: periodLabel,
            amount: fineAmount,
            paidAmount: 0,
            status: ObligationStatus.PENDING,
            dueDate,
          },
        });
        finesCreated++;
      } catch {
        // Ignorar duplicados
      }
    }

    return {
      message: "Compensaciones por inasistencia aplicadas en Tesorería",
      totalAbsents: absentMembers.length,
      obligationsCreated: finesCreated,
      fineAmountPerMember: fineAmount,
      feeConfigId: feeConfig.id,
    };
  }

  /**
   * Listar mingas de la JAC con estadísticas de asistencia
   */
  async getMingas(jacId: string) {
    const mingas = await this.prisma.post.findMany({
      where: { jacId, type: PostType.COMMUNAL_WORK },
      include: {
        author: {
          select: { firstName: true, lastName: true },
        },
        mingaAttendances: {
          select: { attending: true, attended: true },
        },
      },
      orderBy: { eventDate: "desc" },
    });

    return mingas.map((m) => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      content: m.content,
      eventDate: m.eventDate,
      location: m.location,
      priority: m.priority,
      author: `${m.author.firstName} ${m.author.lastName}`,
      totalConfirmed: m.mingaAttendances.filter((a) => a.attending).length,
      totalAttended: m.mingaAttendances.filter((a) => a.attended).length,
      createdAt: m.createdAt,
    }));
  }

  /**
   * Planilla detallada de asistencia de una minga
   */
  async getMingaAttendanceList(jacId: string, postId: string) {
    return this.prisma.mingaAttendance.findMany({
      where: { postId, jacId },
      include: {
        user: {
          select: {
            id: true,
            identificationNumber: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: [{ attended: "desc" }, { user: { lastName: "asc" } }],
    });
  }
}


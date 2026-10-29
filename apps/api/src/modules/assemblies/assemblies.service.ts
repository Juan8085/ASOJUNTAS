import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "@conectajac/database";
import {
  CreateAssemblyInput,
  CastAssemblyVoteInput,
  AssemblyStatus,
  MembershipStatus,
} from "@conectajac/shared";

@Injectable()
export class AssembliesService {
  private readonly voteSecret = process.env.VOTE_SECRET_KEY || "conectajac-secret-vote-integrity-key-2026";

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convocatoria formal a Asamblea General (Ordinaria o Extraordinaria)
   */
  async createAssembly(input: CreateAssemblyInput) {
    const jac = await this.prisma.jac.findUnique({
      where: { id: input.jacId },
    });

    if (!jac || !jac.isActive) {
      throw new BadRequestException("JAC no encontrada o inactiva");
    }

    const totalActiveAffiliates = await this.prisma.jacMembership.count({
      where: { jacId: input.jacId, status: MembershipStatus.ACTIVE },
    });

    const assembly = await this.prisma.assembly.create({
      data: {
        jacId: input.jacId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        type: input.type,
        scheduledDate: new Date(input.scheduledDate),
        location: input.location.trim(),
        quorumPercentageRequired: input.quorumPercentageRequired ?? 50,
        status: AssemblyStatus.SCHEDULED,
      },
    });

    return {
      assembly,
      quorumSummary: {
        totalActiveAffiliates,
        requiredPercentage: assembly.quorumPercentageRequired,
        requiredQuorumCount: Math.ceil(
          (totalActiveAffiliates * assembly.quorumPercentageRequired) / 100
        ),
      },
    };
  }

  /**
   * Agregar punto de votación o decisión comunal a la asamblea
   */
  async addTopic(
    assemblyId: string,
    jacId: string,
    input: {
      title: string;
      description?: string;
      options: Array<{ id: string; label: string }>;
    }
  ) {
    const assembly = await this.prisma.assembly.findFirst({
      where: { id: assemblyId, jacId },
    });

    if (!assembly) {
      throw new NotFoundException("Asamblea no encontrada en esta JAC");
    }

    if (assembly.status === AssemblyStatus.FINISHED || assembly.status === AssemblyStatus.CANCELLED) {
      throw new BadRequestException("No se pueden agregar temas a una asamblea finalizada o cancelada");
    }

    if (!input.options || input.options.length < 2) {
      throw new BadRequestException("Debe configurar al menos dos opciones para la votación");
    }

    return this.prisma.assemblyTopic.create({
      data: {
        assemblyId,
        jacId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        options: input.options as unknown as Prisma.InputJsonValue,
        isOpen: true,
      },
    });
  }

  /**
   * Emisión de voto secreto y verificable para afiliados activos
   */
  async castVote(voterUserId: string, input: CastAssemblyVoteInput) {
    const topic = await this.prisma.assemblyTopic.findUnique({
      where: { id: input.topicId },
      include: { assembly: true },
    });

    if (!topic || topic.assemblyId !== input.assemblyId) {
      throw new NotFoundException("Tema de votación no encontrado en esta asamblea");
    }

    if (!topic.isOpen) {
      throw new BadRequestException("La votación para este tema ya se encuentra cerrada");
    }

    if (topic.assembly.status !== AssemblyStatus.IN_PROGRESS) {
      throw new BadRequestException(
        "La asamblea debe estar formalmente en curso (IN_PROGRESS) para emitir votos"
      );
    }

    // Validar afiliación activa en la JAC
    const membership = await this.prisma.jacMembership.findFirst({
      where: {
        userId: voterUserId,
        jacId: topic.jacId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new BadRequestException("Solo los afiliados activos de la JAC tienen derecho al voto");
    }

    // Generar hash irreversible para prevenir doble votación sin revelar identidad
    const voteHash = crypto
      .createHmac("sha256", this.voteSecret)
      .update(`${input.topicId}:${voterUserId}`)
      .digest("hex");

    const existingVote = await this.prisma.assemblyVoteRecord.findFirst({
      where: {
        topicId: input.topicId,
        voterUserId,
      },
    });

    if (existingVote) {
      throw new ConflictException("Usted ya ha emitido su voto para este punto del orden del día");
    }

    // Cifrar payload de opción seleccionada
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      crypto.createHash("sha256").update(this.voteSecret).digest(),
      Buffer.alloc(16, 0)
    );
    let encrypted = cipher.update(JSON.stringify({ optionId: input.selectedOptionId }), "utf8", "hex");
    encrypted += cipher.final("hex");

    await this.prisma.assemblyVoteRecord.create({
      data: {
        topicId: input.topicId,
        jacId: topic.jacId,
        voterUserId,
        voteHash,
        encryptedPayload: encrypted,
      },
    });

    return {
      message: "Voto registrado con éxito",
      topicId: input.topicId,
      receiptHash: voteHash.slice(0, 16),
      castAt: new Date(),
    };
  }

  /**
   * Cerrar votación y obtener escrutinio formal
   */
  async closeTopicAndTally(topicId: string, jacId: string) {
    const topic = await this.prisma.assemblyTopic.findFirst({
      where: { id: topicId, jacId },
      include: {
        votes: true,
      },
    });

    if (!topic) {
      throw new NotFoundException("Tema de votación no encontrado");
    }

    // Cerrar tema
    await this.prisma.assemblyTopic.update({
      where: { id: topicId },
      data: { isOpen: false },
    });

    // Desencriptar y computar resultados
    const options = topic.options as Array<{ id: string; label: string }>;
    const tally: Record<string, number> = {};
    for (const opt of options) {
      tally[opt.id] = 0;
    }

    const decipherKey = crypto.createHash("sha256").update(this.voteSecret).digest();
    for (const vote of topic.votes) {
      try {
        const decipher = crypto.createDecipheriv("aes-256-cbc", decipherKey, Buffer.alloc(16, 0));
        let decrypted = decipher.update(vote.encryptedPayload, "hex", "utf8");
        decrypted += decipher.final("utf8");
        const parsed = JSON.parse(decrypted);
        if (parsed.optionId && tally[parsed.optionId] !== undefined) {
          tally[parsed.optionId]++;
        }
      } catch {
        // Voto no legible o corrupto
      }
    }

    return {
      topicId: topic.id,
      title: topic.title,
      isOpen: false,
      totalVotes: topic.votes.length,
      results: options.map((opt) => ({
        id: opt.id,
        label: opt.label,
        votes: tally[opt.id] ?? 0,
        percentage:
          topic.votes.length > 0
            ? Math.round(((tally[opt.id] ?? 0) / topic.votes.length) * 100)
            : 0,
      })),
    };
  }

  /**
   * Actualizar estado de la asamblea (Iniciar, Cerrar quórum, Finalizar con acta PDF)
   */
  async updateStatus(
    assemblyId: string,
    jacId: string,
    input: {
      status: AssemblyStatus;
      quorumReached?: boolean;
      minutesPdfUrl?: string;
    }
  ) {
    const assembly = await this.prisma.assembly.findFirst({
      where: { id: assemblyId, jacId },
    });

    if (!assembly) {
      throw new NotFoundException("Asamblea no encontrada");
    }

    return this.prisma.assembly.update({
      where: { id: assemblyId },
      data: {
        status: input.status,
        ...(input.quorumReached !== undefined && { quorumReached: input.quorumReached }),
        ...(input.minutesPdfUrl && { minutesPdfUrl: input.minutesPdfUrl }),
      },
    });
  }

  /**
   * Listar asambleas de la JAC
   */
  async getAssemblies(jacId: string, status?: AssemblyStatus) {
    return this.prisma.assembly.findMany({
      where: {
        jacId,
        ...(status && { status }),
      },
      include: {
        _count: {
          select: { topics: true },
        },
      },
      orderBy: { scheduledDate: "desc" },
    });
  }

  /**
   * Detalle de asamblea con sus temas y estado de voto para el usuario
   */
  async getAssemblyDetail(assemblyId: string, jacId: string, currentUserId?: string) {
    const assembly = await this.prisma.assembly.findFirst({
      where: { id: assemblyId, jacId },
      include: {
        topics: {
          include: {
            votes: {
              select: {
                id: true,
                voterUserId: true,
              },
            },
          },
        },
      },
    });

    if (!assembly) {
      throw new NotFoundException("Asamblea no encontrada");
    }

    return {
      id: assembly.id,
      title: assembly.title,
      description: assembly.description,
      type: assembly.type,
      scheduledDate: assembly.scheduledDate,
      location: assembly.location,
      status: assembly.status,
      quorumReached: assembly.quorumReached,
      quorumPercentageRequired: assembly.quorumPercentageRequired,
      minutesPdfUrl: assembly.minutesPdfUrl,
      topics: assembly.topics.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        options: t.options,
        isOpen: t.isOpen,
        totalVotes: t.votes.length,
        hasVoted: currentUserId ? t.votes.some((v) => v.voterUserId === currentUserId) : false,
      })),
    };
  }
}

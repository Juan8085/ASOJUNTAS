import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "@conectajac/database";
import {
  CreatePqrsdInput,
  RespondPqrsdInput,
  PqrsdStatus,
  PqrsdType,
} from "@conectajac/shared";

@Injectable()
export class PqrsdService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Radicar PQRSD ciudadana formal (anónima o identificada)
   */
  async createTicket(userId: string | null, input: CreatePqrsdInput) {
    const jac = await this.prisma.jac.findUnique({
      where: { id: input.jacId },
    });

    if (!jac || !jac.isActive) {
      throw new BadRequestException("JAC no válida para radicar solicitud");
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `PQR-${new Date().getFullYear()}-${randomSuffix}`;

    const ticket = await this.prisma.pqrsdTicket.create({
      data: {
        ticketNumber,
        jacId: input.jacId,
        userId: input.isAnonymous ? null : userId,
        isAnonymous: input.isAnonymous ?? false,
        type: input.type,
        status: PqrsdStatus.RECEIVED,
        subject: input.subject.trim(),
        description: input.description.trim(),
        attachments: (input.attachments || []) as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      message: "Solicitud radicada formalmente ante la Junta de Acción Comunal",
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.id,
      status: ticket.status,
      createdAt: ticket.createdAt,
    };
  }

  /**
   * Listar solicitudes de la JAC (Directivos)
   */
  async getTickets(
    jacId: string,
    query?: { status?: PqrsdStatus; type?: PqrsdType }
  ) {
    return this.prisma.pqrsdTicket.findMany({
      where: {
        jacId,
        ...(query?.status && { status: query.status }),
        ...(query?.type && { type: query.type }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Mis solicitudes radicadas (Ciudadano)
   */
  async getMyTickets(userId: string) {
    return this.prisma.pqrsdTicket.findMany({
      where: { userId },
      include: {
        jac: {
          select: {
            id: true,
            name: true,
            veredaOrBarrio: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Asignar ticket a un directivo para estudio (ej: Fiscal, Vicepresidente)
   */
  async assignTicket(ticketId: string, jacId: string, assignedToUserId: string) {
    const ticket = await this.prisma.pqrsdTicket.findFirst({
      where: { id: ticketId, jacId },
    });

    if (!ticket) {
      throw new NotFoundException("Solicitud no encontrada");
    }

    return this.prisma.pqrsdTicket.update({
      where: { id: ticketId },
      data: {
        assignedToUserId,
        status: PqrsdStatus.UNDER_REVIEW,
      },
    });
  }

  /**
   * Dar respuesta formal a la PQRSD comunal
   */
  async respondTicket(input: RespondPqrsdInput) {
    const ticket = await this.prisma.pqrsdTicket.findUnique({
      where: { id: input.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException("Solicitud no encontrada");
    }

    return this.prisma.pqrsdTicket.update({
      where: { id: input.ticketId },
      data: {
        status: input.status,
        responseText: input.responseText.trim(),
        respondedAt: new Date(),
      },
    });
  }
}

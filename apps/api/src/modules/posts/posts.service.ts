import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreatePostInput,
  PostScope,
  PostType,
  PostPriority,
} from "@conectajac/shared";

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Publicar comunicado, noticia o alerta comunal temprana
   */
  async createPost(authorUserId: string, input: CreatePostInput) {
    if (input.scope === PostScope.JAC_LOCAL && !input.jacId) {
      throw new BadRequestException("El identificador de la JAC es requerido para publicaciones locales");
    }

    const timestamp = Date.now().toString().slice(-6);
    const slug = `${input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")}-${timestamp}`;

    return this.prisma.post.create({
      data: {
        jacId: input.scope === PostScope.JAC_LOCAL ? input.jacId : null,
        authorUserId,
        scope: input.scope,
        type: input.type,
        priority: input.priority || PostPriority.NORMAL,
        title: input.title.trim(),
        slug,
        content: input.content.trim(),
        excerpt: input.excerpt?.trim() || null,
        coverImageUrl: input.coverImageUrl ?? null,
        eventDate: input.eventDate ? new Date(input.eventDate) : null,
        location: input.location?.trim() || null,
        requiresAttendanceConfirmation: input.requiresAttendanceConfirmation ?? false,
        isPublished: true,
      },
    });
  }

  /**
   * Feed de publicaciones comunitarias (PÚBLICO)
   * Prioriza automáticamente alertas de emergencia (URGENT) en la parte superior
   */
  async findFeed(query?: {
    jacId?: string;
    scope?: PostScope;
    type?: PostType;
    priority?: PostPriority;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.max(1, Math.min(50, query?.limit ?? 20));
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      isPublished: true,
      ...(query?.scope && { scope: query.scope }),
      ...(query?.type && { type: query.type }),
      ...(query?.priority && { priority: query.priority }),
    };

    if (query?.jacId) {
      whereClause.OR = [
        { jacId: query.jacId },
        { scope: PostScope.MUNICIPAL_ASOJUNTAS }, // Las circulares municipales siempre se incluyen
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.post.count({ where: whereClause }),
      this.prisma.post.findMany({
        where: whereClause,
        include: {
          author: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          jac: {
            select: {
              name: true,
              veredaOrBarrio: true,
            },
          },
        },
        orderBy: [{ priority: "desc" }, { publishedAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener comunicado por su slug
   */
  async getPostBySlug(slug: string) {
    const post = await this.prisma.post.findFirst({
      where: { slug, isPublished: true },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        jac: {
          select: {
            name: true,
            veredaOrBarrio: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException("Publicación no encontrada");
    }

    return post;
  }

  /**
   * Eliminar o despublicar comunicado
   */
  async deletePost(postId: string, jacId?: string) {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        ...(jacId && { jacId }),
      },
    });

    if (!post) {
      throw new NotFoundException("Publicación no encontrada");
    }

    return this.prisma.post.delete({
      where: { id: postId },
    });
  }
}

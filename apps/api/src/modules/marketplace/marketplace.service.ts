import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "@conectajac/database";
import {
  ProducerProfileInput,
  CreateMarketProductInput,
  FilterMarketProductsInput,
  CreateMarketOrderInput,
  UpdateMarketOrderStatusInput,
  MarketOrderStatus,
} from "@conectajac/shared";

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear o actualizar perfil de productor agropecuario veredal
   */
  async upsertProducerProfile(userId: string, input: ProducerProfileInput) {
    const jac = await this.prisma.jac.findUnique({
      where: { id: input.jacId },
    });

    if (!jac || !jac.isActive) {
      throw new BadRequestException("JAC no válida para registrar perfil campesino");
    }

    return this.prisma.producerProfile.upsert({
      where: { userId },
      update: {
        jacId: input.jacId,
        farmName: input.farmName.trim(),
        veredaName: input.veredaName.trim(),
        bio: input.bio?.trim() || null,
        whatsappContact: input.whatsappContact.trim(),
        acceptsOnlinePayment: input.acceptsOnlinePayment ?? true,
        acceptsCashOnDelivery: input.acceptsCashOnDelivery ?? true,
        bannerImageUrl: input.bannerImageUrl ?? null,
      },
      create: {
        userId,
        jacId: input.jacId,
        farmName: input.farmName.trim(),
        veredaName: input.veredaName.trim(),
        bio: input.bio?.trim() || null,
        whatsappContact: input.whatsappContact.trim(),
        acceptsOnlinePayment: input.acceptsOnlinePayment ?? true,
        acceptsCashOnDelivery: input.acceptsCashOnDelivery ?? true,
        bannerImageUrl: input.bannerImageUrl ?? null,
        isVerified: true, // Inicialmente verificado por su pertenencia comunal
      },
    });
  }

  /**
   * Obtener mi perfil de productor
   */
  async getMyProducerProfile(userId: string) {
    const profile = await this.prisma.producerProfile.findUnique({
      where: { userId },
      include: {
        jac: {
          select: {
            id: true,
            name: true,
            veredaOrBarrio: true,
          },
        },
        products: {
          where: { isAvailable: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException("Aún no ha configurado su perfil de productor campesino");
    }

    return profile;
  }

  /**
   * Publicar producto agrícola en el catálogo del mercado campesino
   */
  async createProduct(userId: string, input: CreateMarketProductInput) {
    const producer = await this.prisma.producerProfile.findUnique({
      where: { userId },
    });

    if (!producer || !producer.isActive) {
      throw new ForbiddenException(
        "Debe crear un perfil de productor veredal antes de publicar productos"
      );
    }

    // Asegurar que la categoría exista
    const category = await this.prisma.marketCategory.findUnique({
      where: { id: input.categoryId },
    });

    if (!category) {
      throw new BadRequestException("Categoría de producto no encontrada");
    }

    return this.prisma.marketProduct.create({
      data: {
        producerId: producer.id,
        jacId: producer.jacId,
        categoryId: input.categoryId,
        title: input.title.trim(),
        description: input.description.trim(),
        price: input.price,
        unit: input.unit,
        stockQuantity: input.stockQuantity,
        images: input.images as unknown as Prisma.InputJsonValue,
        isOrganic: input.isOrganic ?? false,
        harvestDate: input.harvestDate ? new Date(input.harvestDate) : null,
        availableForDelivery: input.availableForDelivery ?? true,
        availableForPickup: input.availableForPickup ?? true,
        isAvailable: true,
      },
    });
  }

  /**
   * Listar categorías del mercado campesino
   */
  async getCategories() {
    return this.prisma.marketCategory.findMany({
      orderBy: { name: "asc" },
    });
  }

  /**
   * Catálogo público de productos campesinos (PÚBLICO)
   */
  async findProducts(query: FilterMarketProductsInput) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(50, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      isAvailable: true,
      ...(query.jacId && { jacId: query.jacId }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.onlyOrganic && { isOrganic: true }),
    };

    if (query.municipalityId) {
      whereClause.jac = {
        municipalityId: query.municipalityId,
      };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      whereClause.price = {
        ...(query.minPrice !== undefined && { gte: query.minPrice }),
        ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
      };
    }

    if (query.search) {
      whereClause.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.marketProduct.count({ where: whereClause }),
      this.prisma.marketProduct.findMany({
        where: whereClause,
        include: {
          producer: {
            select: {
              farmName: true,
              veredaName: true,
              whatsappContact: true,
              rating: true,
            },
          },
          jac: {
            select: {
              name: true,
              veredaOrBarrio: true,
            },
          },
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
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
   * Crear orden de compra comunitaria
   */
  async createOrder(buyerUserId: string | null, input: CreateMarketOrderInput) {
    const producer = await this.prisma.producerProfile.findUnique({
      where: { id: input.producerId },
    });

    if (!producer) {
      throw new NotFoundException("Productor no encontrado");
    }

    // 1. Validar productos y calcular totales
    const productIds = input.items.map((i) => i.productId);
    const products = await this.prisma.marketProduct.findMany({
      where: {
        id: { in: productIds },
        producerId: input.producerId,
        isAvailable: true,
      },
    });

    if (products.length !== input.items.length) {
      throw new BadRequestException("Uno o más productos no pertenecen al productor o no están disponibles");
    }

    // 2. Transacción para decrementar stock y crear orden
    return this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData = [];

      for (const item of input.items) {
        const product = products.find((p) => p.id === item.productId)!;
        const currentStock = Number(product.stockQuantity);

        if (currentStock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para el producto '${product.title}'. Disponible: ${currentStock} ${product.unit}`
          );
        }

        const subtotal = Number(product.price) * item.quantity;
        totalAmount += subtotal;

        // Decrementar stock
        await tx.marketProduct.update({
          where: { id: product.id },
          data: {
            stockQuantity: currentStock - item.quantity,
          },
        });

        orderItemsData.push({
          productId: product.id,
          productTitle: product.title,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal,
        });
      }

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${randomSuffix}`;

      const order = await tx.marketOrder.create({
        data: {
          orderNumber,
          producerId: input.producerId,
          jacId: producer.jacId,
          buyerUserId,
          buyerName: input.buyerName.trim(),
          buyerPhone: input.buyerPhone.trim(),
          deliveryMethod: input.deliveryMethod,
          deliveryAddress: input.deliveryAddress?.trim() || null,
          status: MarketOrderStatus.PENDING_CONFIRMATION,
          totalAmount,
          paymentMethod: input.paymentMethod,
          customerNotes: input.customerNotes?.trim() || null,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      return {
        message: "Pedido del mercado campesino registrado exitosamente",
        order,
      };
    });
  }

  /**
   * Actualizar estado del pedido por el productor (Confirmar, Despachar, Entregar)
   */
  async updateOrderStatus(producerUserId: string, input: UpdateMarketOrderStatusInput) {
    const producer = await this.prisma.producerProfile.findUnique({
      where: { userId: producerUserId },
    });

    if (!producer) {
      throw new ForbiddenException("No tiene un perfil de productor activo");
    }

    const order = await this.prisma.marketOrder.findFirst({
      where: { id: input.orderId, producerId: producer.id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException("Pedido no encontrado");
    }

    // Si se cancela, restaurar stock de los productos
    if (
      input.status === MarketOrderStatus.CANCELLED &&
      order.status !== MarketOrderStatus.CANCELLED
    ) {
      for (const item of order.items) {
        await this.prisma.marketProduct.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: Number(item.quantity),
            },
          },
        });
      }
    }

    return this.prisma.marketOrder.update({
      where: { id: input.orderId },
      data: {
        status: input.status,
      },
    });
  }

  /**
   * Órdenes recibidas por el productor
   */
  async getProducerOrders(producerUserId: string, status?: MarketOrderStatus) {
    const producer = await this.prisma.producerProfile.findUnique({
      where: { userId: producerUserId },
    });

    if (!producer) {
      throw new ForbiddenException("No tiene un perfil de productor activo");
    }

    return this.prisma.marketOrder.findMany({
      where: {
        producerId: producer.id,
        ...(status && { status }),
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Órdenes realizadas por el comprador
   */
  async getBuyerOrders(buyerUserId: string) {
    return this.prisma.marketOrder.findMany({
      where: { buyerUserId },
      include: {
        producer: {
          select: {
            farmName: true,
            veredaName: true,
            whatsappContact: true,
          },
        },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

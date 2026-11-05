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
  MembershipStatus,
  PaymentMethod,
  DeliveryMethod,
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
    let producer = await this.prisma.producerProfile.findUnique({
      where: { userId },
    });

    // Si aún no ha configurado perfil de productor, crearlo automáticamente a partir de su afiliación
    if (!producer) {
      const membership = await this.prisma.jacMembership.findFirst({
        where: { userId, status: MembershipStatus.ACTIVE },
        include: { user: true },
      });

      if (!membership) {
        throw new ForbiddenException(
          "Debe contar con afiliación activa a una JAC para vender en el Mercado Campesino"
        );
      }

      producer = await this.prisma.producerProfile.create({
        data: {
          userId,
          jacId: membership.jacId,
          farmName: membership.farmName || `Finca de ${membership.user.firstName}`,
          veredaName: membership.veredaOrBarrio || "Sector Veredal",
          whatsappContact: membership.user.phone || "3000000000",
          bio: "Productor agrícola comunal registrado en el libro de afiliados",
          isActive: true,
          isVerified: true,
        },
      });
    }

    // Resolver la categoría del producto
    let resolvedCategoryId = input.categoryId;

    if (resolvedCategoryId) {
      const exists = await this.prisma.marketCategory.findUnique({
        where: { id: resolvedCategoryId },
      });
      if (!exists) resolvedCategoryId = undefined;
    }

    if (!resolvedCategoryId && input.category) {
      const catSlug = input.category.toLowerCase().replace(/_/g, "-");
      const foundBySlug = await this.prisma.marketCategory.findFirst({
        where: {
          OR: [
            { slug: { contains: catSlug, mode: "insensitive" } },
            { name: { contains: input.category, mode: "insensitive" } },
          ],
        },
      });
      if (foundBySlug) resolvedCategoryId = foundBySlug.id;
    }

    if (!resolvedCategoryId) {
      const firstCat = await this.prisma.marketCategory.findFirst({
        orderBy: { displayOrder: "asc" },
      });
      if (firstCat) {
        resolvedCategoryId = firstCat.id;
      } else {
        const createdCat = await this.prisma.marketCategory.create({
          data: {
            name: "Productos del Campo y Granja",
            slug: "productos-campo-granja",
            displayOrder: 1,
          },
        });
        resolvedCategoryId = createdCat.id;
      }
    }

    const title = (input.title || input.name || "Cosecha Campesina").trim();
    const description = (input.description || "Producto fresco cosechado directamente en vereda").trim();
    const stockQuantity = input.stockQuantity ?? input.stock ?? 10;
    const defaultImages = [
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
    ];
    const imagesToSave =
      input.images && input.images.length > 0 ? input.images : defaultImages;

    return this.prisma.marketProduct.create({
      data: {
        producerId: producer.id,
        jacId: producer.jacId,
        categoryId: resolvedCategoryId,
        title,
        description,
        price: input.price,
        unit: input.unit,
        stockQuantity,
        images: imagesToSave as unknown as Prisma.InputJsonValue,
        isOrganic: input.isOrganic ?? false,
        harvestDate: input.harvestDate ? new Date(input.harvestDate) : null,
        availableForDelivery: input.availableForDelivery ?? true,
        availableForPickup: input.availableForPickup ?? true,
        isAvailable: true,
      },
    });
  }

  /**
   * Listar todos los productos del mercado para administración y moderación directiva
   */
  async getAdminProducts(jacId: string, query?: { search?: string; status?: string }) {
    const whereClause: Record<string, unknown> = {
      jacId,
      ...(query?.status === "active" && { isAvailable: true }),
      ...(query?.status === "suspended" && { isAvailable: false }),
    };

    if (query?.search) {
      whereClause.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.marketProduct.findMany({
      where: whereClause,
      include: {
        producer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                identificationNumber: true,
                phone: true,
              },
            },
          },
        },
        category: true,
        _count: {
          select: { orderItems: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Moderar estado del producto (Aprobar o Suspender por cumplimiento legal/estatutario)
   */
  async updateProductStatus(jacId: string, productId: string, isAvailable: boolean) {
    const product = await this.prisma.marketProduct.findFirst({
      where: { id: productId, jacId },
    });

    if (!product) {
      throw new NotFoundException("Producto no encontrado en esta JAC");
    }

    return this.prisma.marketProduct.update({
      where: { id: productId },
      data: { isAvailable },
    });
  }

  /**
   * Eliminar producto del mercado campesino (Directivos JAC)
   */
  async deleteProduct(jacId: string, productId: string) {
    const product = await this.prisma.marketProduct.findFirst({
      where: { id: productId, jacId },
    });

    if (!product) {
      throw new NotFoundException("Producto no encontrado en esta JAC");
    }

    await this.prisma.marketProduct.delete({
      where: { id: productId },
    });

    return { message: "Producto retirado del mercado campesino satisfactoriamente" };
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
    // 1. Validar productos
    const productIds = input.items.map((i) => i.productId);
    const products = await this.prisma.marketProduct.findMany({
      where: {
        id: { in: productIds },
        isAvailable: true,
      },
      include: {
        producer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (products.length !== input.items.length) {
      throw new BadRequestException("Uno o más productos no pertenecen al catálogo o no están disponibles");
    }

    const firstProduct = products[0];
    const targetProducerId = input.producerId || firstProduct.producerId;
    const producer = firstProduct.producer;

    if (!producer) {
      throw new NotFoundException("Productor no encontrado para los productos solicitados");
    }

    // Resolver datos del comprador
    let buyerName = input.buyerName?.trim();
    let buyerPhone = input.buyerPhone?.trim();

    if (buyerUserId && (!buyerName || !buyerPhone)) {
      const buyerUser = await this.prisma.user.findUnique({
        where: { id: buyerUserId },
      });
      if (buyerUser) {
        buyerName = buyerName || `${buyerUser.firstName} ${buyerUser.lastName}`.trim();
        buyerPhone = buyerPhone || buyerUser.phone;
      }
    }

    buyerName = buyerName || "Afiliado Vecino";
    buyerPhone = buyerPhone || "Sin teléfono registrado";

    const paymentMethod = input.paymentMethod || PaymentMethod.CASH;
    const deliveryMethod = input.deliveryMethod || DeliveryMethod.PICKUP_AT_FARM;
    const customerNotes =
      input.customerNotes?.trim() || (input as any).deliveryNotes?.trim() || null;

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
          producerId: targetProducerId,
          jacId: producer.jacId,
          buyerUserId,
          buyerName,
          buyerPhone,
          deliveryMethod,
          deliveryAddress: input.deliveryAddress?.trim() || null,
          status: MarketOrderStatus.PENDING_CONFIRMATION,
          totalAmount,
          paymentMethod,
          customerNotes,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      const rawPhone = (producer.whatsappContact || producer.user?.phone || "").replace(/\D/g, "");
      const producerName =
        `${producer.user?.firstName || ""} ${producer.user?.lastName || ""}`.trim() || producer.farmName;

      const whatsappMessage = encodeURIComponent(
        `Hola ${producerName}, te acabo de encargar por el Mercado Campesino ConectaJAC:\n` +
          `📦 Pedido: #${orderNumber}\n` +
          `🌾 Cosecha: ${orderItemsData.map((it) => `${it.quantity}x ${it.productTitle}`).join(", ")}\n` +
          `💰 Total: $${totalAmount.toLocaleString("es-CO")} COP\n` +
          `📍 Entrega: ${deliveryMethod === DeliveryMethod.PICKUP_AT_FARM ? "Recoger en finca" : "Entrega en vereda"}\n` +
          `👤 Comprador: ${buyerName} (Tel: ${buyerPhone})`
      );

      const whatsappUrl = rawPhone
        ? `https://wa.me/57${rawPhone.slice(-10)}?text=${whatsappMessage}`
        : null;

      return {
        message: "Pedido del mercado campesino registrado exitosamente",
        order,
        producer: {
          id: producer.id,
          farmName: producer.farmName,
          veredaName: producer.veredaName,
          name: producerName,
          phone: producer.whatsappContact || producer.user?.phone,
          whatsappUrl,
        },
      };
    });
  }

  /**
   * Listar todos los pedidos de la JAC para los directivos
   */
  async getAdminOrders(jacId: string, query?: { search?: string; status?: MarketOrderStatus }) {
    return this.prisma.marketOrder.findMany({
      where: {
        jacId,
        ...(query?.status && { status: query.status }),
        ...(query?.search && {
          OR: [
            { orderNumber: { contains: query.search, mode: "insensitive" } },
            { buyerName: { contains: query.search, mode: "insensitive" } },
            { buyerPhone: { contains: query.search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        items: true,
        producer: {
          select: {
            id: true,
            farmName: true,
            veredaName: true,
            whatsappContact: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                identificationNumber: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
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
      return [];
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


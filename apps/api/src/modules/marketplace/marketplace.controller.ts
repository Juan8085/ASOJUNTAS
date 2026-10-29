import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { MarketplaceService } from "./marketplace.service";
import { Public } from "../../core/decorators/public.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../core/pipes/zod-validation.pipe";
import {
  ProducerProfileSchema,
  ProducerProfileInput,
  CreateMarketProductSchema,
  CreateMarketProductInput,
  CreateMarketOrderSchema,
  CreateMarketOrderInput,
  UpdateMarketOrderStatusSchema,
  UpdateMarketOrderStatusInput,
  MarketOrderStatus,
  UserJwtPayload,
} from "@conectajac/shared";

@ApiTags("Mercado Campesino")
@Controller("marketplace")
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Public()
  @Get("categories")
  @ApiOperation({
    summary: "Listar categorías del mercado campesino",
    description: "Frutas, hortalizas, lácteos, huevos campesinos, café y artesanías",
  })
  async getCategories() {
    return this.marketplaceService.getCategories();
  }

  @Public()
  @Get("products")
  @ApiOperation({
    summary: "Catálogo público de productos agrícolas locales",
    description: "Catálogo municipal abierto con filtros por vereda, JAC, categoría, precio y sello orgánico",
  })
  @ApiQuery({ name: "municipalityId", required: false, type: String })
  @ApiQuery({ name: "jacId", required: false, type: String })
  @ApiQuery({ name: "categoryId", required: false, type: String })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "onlyOrganic", required: false, type: Boolean })
  @ApiQuery({ name: "minPrice", required: false, type: Number })
  @ApiQuery({ name: "maxPrice", required: false, type: Number })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async findProducts(
    @Query("municipalityId") municipalityId?: string,
    @Query("jacId") jacId?: string,
    @Query("categoryId") categoryId?: string,
    @Query("search") search?: string,
    @Query("onlyOrganic") onlyOrganic?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.marketplaceService.findProducts({
      municipalityId,
      jacId,
      categoryId,
      search,
      onlyOrganic: onlyOrganic === "true",
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Post("producer-profile")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Crear o actualizar perfil de productor campesino",
    description: "Registra la finca, vereda y canal de contacto de WhatsApp del agricultor",
  })
  @ApiResponse({ status: 200, description: "Perfil de productor guardado exitosamente" })
  @UsePipes(new ZodValidationPipe(ProducerProfileSchema))
  async upsertProducerProfile(
    @CurrentUser() user: UserJwtPayload,
    @Body() body: ProducerProfileInput
  ) {
    return this.marketplaceService.upsertProducerProfile(user.sub, body);
  }

  @Get("producer-profile/me")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Consultar mi perfil de productor",
    description: "Retorna los datos de la finca y los productos activos del productor",
  })
  async getMyProducerProfile(@CurrentUser() user: UserJwtPayload) {
    return this.marketplaceService.getMyProducerProfile(user.sub);
  }

  @Post("products")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Publicar producto campesino",
    description: "Añade una cosecha o producto al mercado con unidad de medida (Kilo, Arroba, Bulto)",
  })
  @ApiResponse({ status: 201, description: "Producto publicado exitosamente" })
  @UsePipes(new ZodValidationPipe(CreateMarketProductSchema))
  async createProduct(
    @CurrentUser() user: UserJwtPayload,
    @Body() body: CreateMarketProductInput
  ) {
    return this.marketplaceService.createProduct(user.sub, body);
  }

  @Post("orders")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Realizar pedido comunitario al campesino",
    description: "Genera la orden con descuento de stock y opción de pago en línea o contra entrega",
  })
  @ApiResponse({ status: 201, description: "Orden creada con éxito" })
  @UsePipes(new ZodValidationPipe(CreateMarketOrderSchema))
  async createOrder(
    @CurrentUser() user: UserJwtPayload,
    @Body() body: CreateMarketOrderInput
  ) {
    return this.marketplaceService.createOrder(user.sub, body);
  }

  @Get("orders/buyer")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Listar mis pedidos como comprador",
    description: "Historial de compras realizadas a los productores de las veredas",
  })
  async getBuyerOrders(@CurrentUser() user: UserJwtPayload) {
    return this.marketplaceService.getBuyerOrders(user.sub);
  }

  @Get("orders/producer")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Listar pedidos recibidos como productor",
    description: "Pedidos pendientes de despacho y entrega para el productor campesino",
  })
  @ApiQuery({ name: "status", required: false, enum: MarketOrderStatus })
  async getProducerOrders(
    @CurrentUser() user: UserJwtPayload,
    @Query("status") status?: MarketOrderStatus
  ) {
    return this.marketplaceService.getProducerOrders(user.sub, status);
  }

  @Patch("orders/status")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Actualizar estado del pedido (Productor)",
    description: "Permite confirmar, alistar, enviar o entregar la orden de productos agrícolas",
  })
  @UsePipes(new ZodValidationPipe(UpdateMarketOrderStatusSchema))
  async updateOrderStatus(
    @CurrentUser() user: UserJwtPayload,
    @Body() body: UpdateMarketOrderStatusInput
  ) {
    return this.marketplaceService.updateOrderStatus(user.sub, body);
  }
}

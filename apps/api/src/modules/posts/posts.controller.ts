import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { PostsService } from "./posts.service";
import { Public } from "../../core/decorators/public.decorator";
import { Roles } from "../../core/decorators/roles.decorator";
import { RolesGuard } from "../../core/guards/roles.guard";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { CurrentTenant } from "../../core/decorators/current-tenant.decorator";
import { ZodValidationPipe } from "../../core/pipes/zod-validation.pipe";
import {
  CreatePostSchema,
  CreatePostInput,
  PostScope,
  PostType,
  PostPriority,
  UserRole,
  UserJwtPayload,
} from "@conectajac/shared";

@ApiTags("Cartelera Comunal y Alertas")
@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: "Consultar cartelera comunal y alertas tempranas (Público)",
    description: "Feed con avisos oficiales, circulares de Asojuntas y alertas urgentes en la cabecera",
  })
  @ApiQuery({ name: "jacId", required: false, type: String })
  @ApiQuery({ name: "scope", required: false, enum: PostScope })
  @ApiQuery({ name: "type", required: false, enum: PostType })
  @ApiQuery({ name: "priority", required: false, enum: PostPriority })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async findFeed(
    @Query("jacId") jacId?: string,
    @Query("scope") scope?: PostScope,
    @Query("type") type?: PostType,
    @Query("priority") priority?: PostPriority,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.postsService.findFeed({
      jacId,
      scope,
      type,
      priority,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Public()
  @Get(":slug")
  @ApiOperation({
    summary: "Leer publicación completa por slug",
    description: "Visualiza el contenido completo de una noticia, alerta o circular",
  })
  async getPostBySlug(@Param("slug") slug: string) {
    return this.postsService.getPostBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_VICE_PRESIDENT,
    UserRole.JAC_SECRETARY
  )
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Publicar comunicado o alerta temprana (Directivos / Asojuntas)",
    description: "Emite circulares oficiales o avisos de emergencia comunitaria (vías cerradas, clima)",
  })
  @ApiResponse({ status: 201, description: "Publicación creada con éxito" })
  @UsePipes(new ZodValidationPipe(CreatePostSchema))
  async createPost(
    @CurrentUser() user: UserJwtPayload,
    @Body() body: CreatePostInput
  ) {
    return this.postsService.createPost(user.sub, body);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT
  )
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Eliminar publicación de la cartelera",
    description: "Retira una noticia o alerta comunitaria",
  })
  async deletePost(
    @Param("id") id: string,
    @CurrentTenant() jacId?: string
  ) {
    return this.postsService.deletePost(id, jacId);
  }
}

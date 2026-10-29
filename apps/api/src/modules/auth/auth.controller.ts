import { Controller, Post, Get, Body, UsePipes, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { Public } from "../../core/decorators/public.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../core/pipes/zod-validation.pipe";
import {
  LoginSchema,
  LoginInput,
  RegisterCitizenSchema,
  RegisterCitizenInput,
  RefreshTokenSchema,
  RefreshTokenInput,
  UserJwtPayload,
} from "@conectajac/shared";

@ApiTags("Autenticación")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Inicio de sesión unificado",
    description: "Permite autenticarse mediante correo electrónico o número de cédula para Directivos, Super Admin o Ciudadanos",
  })
  @ApiResponse({ status: 200, description: "Sesión iniciada exitosamente con tokens de acceso" })
  @ApiResponse({ status: 401, description: "Credenciales inválidas o cuenta inactiva" })
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() body: LoginInput) {
    return this.authService.login(body);
  }

  @Public()
  @Post("register-citizen")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Registro público de habitante/afiliado",
    description: "Registra a un ciudadano y lo afilia de inmediato con su folio en el Libro Digital de la JAC seleccionada",
  })
  @ApiResponse({ status: 201, description: "Usuario registrado y afiliado exitosamente" })
  @ApiResponse({ status: 409, description: "El número de documento o correo ya está registrado" })
  @UsePipes(new ZodValidationPipe(RegisterCitizenSchema))
  async registerCitizen(@Body() body: RegisterCitizenInput) {
    return this.authService.registerCitizen(body);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Renovar token de acceso",
    description: "Genera un nuevo par de tokens a partir de un refresh token válido",
  })
  @ApiResponse({ status: 200, description: "Tokens renovados exitosamente" })
  @ApiResponse({ status: 401, description: "Refresh token inválido o expirado" })
  @UsePipes(new ZodValidationPipe(RefreshTokenSchema))
  async refresh(@Body() body: RefreshTokenInput) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Obtener perfil de usuario autenticado",
    description: "Retorna los datos personales, membresías activas en JACs y roles del usuario actual",
  })
  @ApiResponse({ status: 200, description: "Datos de perfil obtenidos exitosamente" })
  @ApiResponse({ status: 401, description: "No autenticado" })
  async getProfile(@CurrentUser() user: UserJwtPayload) {
    return this.authService.getProfile(user.sub);
  }
}


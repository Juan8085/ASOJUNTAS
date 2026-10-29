import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CertificatesService } from "./certificates.service";
import { Public } from "../../core/decorators/public.decorator";
import { Roles } from "../../core/decorators/roles.decorator";
import { RolesGuard } from "../../core/guards/roles.guard";
import { TenantGuard } from "../../core/guards/tenant.guard";
import { CurrentTenant } from "../../core/decorators/current-tenant.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../core/pipes/zod-validation.pipe";
import {
  RequestCertificateSchema,
  RequestCertificateInput,
  UserRole,
  UserJwtPayload,
} from "@conectajac/shared";

@ApiTags("Certificados Comunales")
@Controller("certificates")
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post("request")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Solicitar y expedir certificado comunal",
    description: "Genera certificado de Residencia, Afiliación o Paz y Salvo con firma digital y QR verificable",
  })
  @ApiResponse({ status: 201, description: "Certificado generado exitosamente" })
  @ApiResponse({ status: 400, description: "No cumple con los requisitos o adeuda cuotas de tesorería" })
  @UsePipes(new ZodValidationPipe(RequestCertificateSchema))
  async requestCertificate(
    @CurrentUser() user: UserJwtPayload,
    @Body() body: RequestCertificateInput
  ) {
    return this.certificatesService.requestCertificate(user.sub, body);
  }

  @Get("my-certificates")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Listar mis certificados comunales expedidos",
    description: "Permite al habitante descargar o consultar el historial de sus certificados",
  })
  async getMyCertificates(
    @CurrentUser() user: UserJwtPayload,
    @CurrentTenant() tenantId?: string
  ) {
    return this.certificatesService.getMyCertificates(user.sub, tenantId);
  }

  @Public()
  @Get("verify/:code")
  @ApiOperation({
    summary: "Validación pública de certificado en tiempo real",
    description: "Acceso libre para entidades (bancos, alcaldía, notarías) para verificar autenticidad escaneando el QR",
  })
  @ApiResponse({ status: 200, description: "Resultado de validación de autenticidad" })
  async verifyCertificate(@Param("code") code: string) {
    return this.certificatesService.verifyCertificate(code);
  }

  @Patch(":id/revoke")
  @ApiBearerAuth()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.JAC_ADMIN,
    UserRole.JAC_PRESIDENT,
    UserRole.JAC_SECRETARY
  )
  @UseGuards(TenantGuard, RolesGuard)
  @ApiOperation({
    summary: "Revocar certificado comunal (Directivos)",
    description: "Invalida un certificado previamente expedido en caso de adulteración o falsedad comprobada",
  })
  async revokeCertificate(
    @CurrentTenant() jacId: string,
    @Param("id") id: string
  ) {
    return this.certificatesService.revokeCertificate(id, jacId);
  }
}

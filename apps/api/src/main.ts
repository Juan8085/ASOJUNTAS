import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("ConectaJAC-API");

  const fastifyAdapter = new FastifyAdapter({
    logger: process.env.NODE_ENV === "development",
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter
  );

  // Habilitar CORS para Web Admin y App Móvil (soporta localhost, IPs locales 192.168.x.x y producción)
  app.enableCors({
    origin: (
      _origin: string | undefined,
      callback: (err: Error | null, allow: boolean) => void
    ) => {
      // Reflejar el origen entrante para permitir localhost, IPs de red local y dominios móviles
      callback(null, true);
    },
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-tenant-id",
      "Accept",
      "Origin",
      "X-Requested-With",
    ],
    credentials: true,
  });

  // Prefijo global para la API v1
  app.setGlobalPrefix("api/v1");

  // Configuración de OpenAPI / Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle("ConectaJAC API")
    .setDescription("API SaaS Multi-Tenant para Gestión Integral de Juntas de Acción Comunal (JAC) y Asojuntas")
    .setVersion("1.0.0")
    .addBearerAuth()
    .addApiKey({ type: "apiKey", name: "x-tenant-id", in: "header" }, "tenant-id")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  await app.listen(port, "0.0.0.0");

  logger.log(`🚀 ConectaJAC Backend corriendo en Fastify en http://localhost:${port}/api/v1`);
  logger.log(`📚 Documentación Swagger disponible en http://localhost:${port}/docs`);
}

void bootstrap();

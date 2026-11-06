import { PipeTransform, Injectable, BadRequestException, ArgumentMetadata } from "@nestjs/common";
import { ZodSchema, ZodError } from "zod";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata?: ArgumentMetadata) {
    // Si el parámetro proviene de un decorador personalizado (ej. @CurrentUser, @CurrentTenant)
    // o es un parámetro de ruta (@Param), omitir la validación de esquema del body
    if (metadata && (metadata.type === "custom" || metadata.type === "param")) {
      return value;
    }

    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: "Error de validación en la petición",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }
      throw new BadRequestException("Cuerpo de petición inválido");
    }
  }
}

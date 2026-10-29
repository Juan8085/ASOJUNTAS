import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UserJwtPayload } from "@conectajac/shared";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "conectajac-secret-jwt-key-local-2026",
    });
  }

  async validate(payload: UserJwtPayload): Promise<UserJwtPayload> {
    if (!payload.sub) {
      throw new UnauthorizedException("Token inválido o sin identificador de sujeto");
    }
    return payload;
  }
}


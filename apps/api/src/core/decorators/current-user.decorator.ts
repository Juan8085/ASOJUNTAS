import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserJwtPayload } from "@conectajac/shared";

export const CurrentUser = createParamDecorator(
  (data: keyof UserJwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserJwtPayload;

    return data ? user?.[data] : user;
  }
);

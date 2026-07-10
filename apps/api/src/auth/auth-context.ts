import {
  createParamDecorator,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext
} from "@nestjs/common";
import type { AuthContext } from "@ai-studio/server-core";
import type { FastifyRequest } from "fastify";

import { PlatformService } from "../platform.service.js";

export const SESSION_COOKIE_NAME = "ai_studio_rewrite_session";

export type AuthenticatedRequest = FastifyRequest & { auth: AuthContext };

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(@Inject(PlatformService) private readonly platform: PlatformService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const signedCookie = request.cookies[SESSION_COOKIE_NAME];
    const unsigned = signedCookie ? request.unsignCookie(signedCookie) : null;
    const token = unsigned?.valid ? unsigned.value : undefined;
    const auth = await this.platform.identity.authenticateSession(token);
    (request as AuthenticatedRequest).auth = auth;
    return true;
  }
}

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth
);

import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import type { Role } from "../generated/prisma/client.js";
import { prisma } from "../prisma.js";
import { type AuthSession, auth } from "./auth.js";

export const PUBLIC = "nines:public";
export const NEEDS_COMPANY = "nines:needs-company";

/** Route is reachable without signing in. */
export const Public = () => SetMetadata(PUBLIC, true);
/** Route works inside one company, picked by the `x-company-id` header. */
export const CompanyScoped = () => SetMetadata(NEEDS_COMPANY, true);

export interface RequestContext {
  session: AuthSession;
  companyId?: string;
  role?: Role;
}

type ContextRequest = Request & { nines?: RequestContext };

/** Checks the Better Auth session cookie and, for company routes, membership. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<ContextRequest>();
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) throw new UnauthorizedException();
    req.nines = { session };

    if (this.reflector.getAllAndOverride<boolean>(NEEDS_COMPANY, targets)) {
      const companyId = req.header("x-company-id");
      if (!companyId) throw new ForbiddenException("Pick a company first");
      const membership = await prisma.membership.findUnique({
        where: { userId_companyId: { userId: session.user.id, companyId } },
      });
      if (!membership) throw new ForbiddenException("You are not a member of this company");
      req.nines.companyId = companyId;
      req.nines.role = membership.role;
    }
    return true;
  }
}

export const Ctx = createParamDecorator((_: unknown, ctx: ExecutionContext): RequestContext => {
  const ctxReq = ctx.switchToHttp().getRequest<ContextRequest>();
  if (!ctxReq.nines) throw new UnauthorizedException();
  return ctxReq.nines;
});

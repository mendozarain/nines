import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  type CanActivate,
  type ExceptionFilter,
  type ArgumentsHost,
} from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import type { ZodType } from "zod";
import { auth, type AuthUser } from "./auth";
import { prisma } from "./prisma";

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user as AuthUser;
});

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session) {
      throw new UnauthorizedException("Please sign in.");
    }
    request.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    } satisfies AuthUser;
    return true;
  }
}

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new BadRequestException(issue?.message ?? "Check the form and try again.");
  }
  return result.data;
}

export function notFound(message = "That record was not found."): never {
  throw new NotFoundException(message);
}

export async function stationFor(userId: string) {
  const station = await prisma.station.findUnique({ where: { ownerId: userId } });
  if (!station) {
    throw new BadRequestException("Set up your station before recording anything.");
  }
  return station;
}

export function dayString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function cents(value: bigint | null | undefined): string {
  return (value ?? 0n).toString();
}

export function dateOnly(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function monthBounds(month: string): { start: Date; end: Date } {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return { start, end };
}

@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status =
      exception && typeof exception === "object" && "getStatus" in exception
        ? (exception as { getStatus: () => number }).getStatus()
        : 500;
    let message = "Something went wrong. Please try again.";
    if (exception && typeof exception === "object" && "getResponse" in exception) {
      const body = (exception as { getResponse: () => unknown }).getResponse();
      if (typeof body === "string") message = body;
      else if (body && typeof body === "object" && "message" in body) {
        const raw = (body as { message: unknown }).message;
        message = Array.isArray(raw) ? raw.join(" ") : String(raw);
      }
    } else if (status === 500) {
      console.error(exception);
    }
    response.status(status).json({ message });
  }
}

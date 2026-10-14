import { Controller, Get } from "@nestjs/common";
import { CompanyScoped, Ctx, type RequestContext } from "../auth/session.guard.js";
import { prisma } from "../prisma.js";

@Controller("accounts")
@CompanyScoped()
export class LedgerController {
  @Get()
  list(@Ctx() ctx: RequestContext) {
    return prisma.ledgerAccount.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { code: "asc" },
    });
  }
}

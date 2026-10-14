import { Body, Controller, Get, Post } from "@nestjs/common";
import { z } from "zod";
import { Ctx, type RequestContext } from "../auth/session.guard.js";
import { DEFAULT_CHART } from "../ledger/default-chart.js";
import { prisma } from "../prisma.js";
import { ZodPipe } from "../zod.pipe.js";

const CreateCompany = z.object({
  name: z.string().trim().min(2, "Enter the registered business name"),
  tradeName: z.string().trim().optional(),
  tin: z
    .string()
    .trim()
    .regex(/^\d{3}-?\d{3}-?\d{3}(-?\d{3,5})?$/, "TIN looks like 000-000-000-00000")
    .optional()
    .or(z.literal("")),
  rdoCode: z.string().trim().optional(),
  address: z.string().trim().optional(),
  taxType: z.enum(["VAT", "NON_VAT"]).default("VAT"),
});
type CreateCompany = z.infer<typeof CreateCompany>;

@Controller("companies")
export class CompaniesController {
  /** Companies the signed-in user belongs to. */
  @Get()
  async mine(@Ctx() ctx: RequestContext) {
    const memberships = await prisma.membership.findMany({
      where: { userId: ctx.session.user.id },
      include: { company: true },
      orderBy: { createdAt: "asc" },
    });
    return memberships.map((m) => ({ ...m.company, role: m.role }));
  }

  /** Create a company, make the creator its owner, and load the starter chart of accounts. */
  @Post()
  create(@Ctx() ctx: RequestContext, @Body(new ZodPipe(CreateCompany)) body: CreateCompany) {
    return prisma.company.create({
      data: {
        ...body,
        tin: body.tin || null,
        memberships: { create: { userId: ctx.session.user.id, role: "OWNER" } },
        accounts: { createMany: { data: [...DEFAULT_CHART] } },
      },
    });
  }
}

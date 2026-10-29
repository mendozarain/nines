import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { AuthUser } from "./auth";
import { AuthGuard, cents, CurrentUser, notFound, parseBody, stationFor } from "./common";
import { prisma } from "./prisma";
import { payrollPatchSchema, payrollSchema } from "./schemas";

function serializePayroll(row: {
  id: string;
  payPeriod: string;
  employeeId: string;
  employeeName: string;
  position: string;
  shiftName: string;
  basicPayCentavos: bigint;
  allowancesCentavos: bigint;
  withholdingCentavos: bigint;
  sssEmployeeCentavos: bigint;
  philhealthEmployeeCentavos: bigint;
  pagibigEmployeeCentavos: bigint;
  otherDeductionsCentavos: bigint;
  sssEmployerCentavos: bigint;
  philhealthEmployerCentavos: bigint;
  pagibigEmployerCentavos: bigint;
  costCenter: string;
  approvedBy: string;
  note: string;
}) {
  const gross = row.basicPayCentavos + row.allowancesCentavos;
  const deductions =
    row.withholdingCentavos +
    row.sssEmployeeCentavos +
    row.philhealthEmployeeCentavos +
    row.pagibigEmployeeCentavos +
    row.otherDeductionsCentavos;
  return {
    id: row.id,
    payPeriod: row.payPeriod,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    position: row.position,
    shiftName: row.shiftName,
    basicPayCentavos: cents(row.basicPayCentavos),
    allowancesCentavos: cents(row.allowancesCentavos),
    withholdingCentavos: cents(row.withholdingCentavos),
    sssEmployeeCentavos: cents(row.sssEmployeeCentavos),
    philhealthEmployeeCentavos: cents(row.philhealthEmployeeCentavos),
    pagibigEmployeeCentavos: cents(row.pagibigEmployeeCentavos),
    otherDeductionsCentavos: cents(row.otherDeductionsCentavos),
    sssEmployerCentavos: cents(row.sssEmployerCentavos),
    philhealthEmployerCentavos: cents(row.philhealthEmployerCentavos),
    pagibigEmployerCentavos: cents(row.pagibigEmployerCentavos),
    grossCentavos: cents(gross),
    netPayCentavos: cents(gross - deductions),
    costCenter: row.costCenter,
    approvedBy: row.approvedBy,
    note: row.note,
  };
}

@Controller("payroll")
@UseGuards(AuthGuard)
export class PayrollController {
  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) {
    const station = await stationFor(user.id);
    const rows = await prisma.payrollEntry.findMany({
      where: {
        stationId: station.id,
        ...(query.payPeriod ? { payPeriod: query.payPeriod } : {}),
      },
      orderBy: [{ payPeriod: "desc" }, { employeeName: "asc" }],
    });
    return { entries: rows.map(serializePayroll) };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const input = parseBody(payrollSchema, body);
    const row = await prisma.payrollEntry.create({
      data: {
        stationId: station.id,
        payPeriod: input.payPeriod,
        employeeId: input.employeeId,
        employeeName: input.employeeName,
        position: input.position,
        shiftName: input.shiftName,
        basicPayCentavos: input.basicPay,
        allowancesCentavos: input.allowances,
        withholdingCentavos: input.withholding,
        sssEmployeeCentavos: input.sssEmployee,
        philhealthEmployeeCentavos: input.philhealthEmployee,
        pagibigEmployeeCentavos: input.pagibigEmployee,
        otherDeductionsCentavos: input.otherDeductions,
        sssEmployerCentavos: input.sssEmployer,
        philhealthEmployerCentavos: input.philhealthEmployer,
        pagibigEmployerCentavos: input.pagibigEmployer,
        costCenter: input.costCenter,
        approvedBy: input.approvedBy,
        note: input.note,
      },
    });
    return serializePayroll(row);
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const station = await stationFor(user.id);
    const row = await prisma.payrollEntry.findFirst({ where: { id, stationId: station.id } });
    if (!row) notFound("That payroll entry was not found.");
    return serializePayroll(row);
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const existing = await prisma.payrollEntry.findFirst({ where: { id, stationId: station.id } });
    if (!existing) notFound("That payroll entry was not found.");
    const input = parseBody(payrollPatchSchema, body);
    const row = await prisma.payrollEntry.update({
      where: { id },
      data: {
        payPeriod: input.payPeriod,
        employeeId: input.employeeId,
        employeeName: input.employeeName,
        position: input.position,
        shiftName: input.shiftName,
        basicPayCentavos: input.basicPay,
        allowancesCentavos: input.allowances,
        withholdingCentavos: input.withholding,
        sssEmployeeCentavos: input.sssEmployee,
        philhealthEmployeeCentavos: input.philhealthEmployee,
        pagibigEmployeeCentavos: input.pagibigEmployee,
        otherDeductionsCentavos: input.otherDeductions,
        sssEmployerCentavos: input.sssEmployer,
        philhealthEmployerCentavos: input.philhealthEmployer,
        pagibigEmployerCentavos: input.pagibigEmployer,
        costCenter: input.costCenter,
        approvedBy: input.approvedBy,
        note: input.note,
      },
    });
    return serializePayroll(row);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const station = await stationFor(user.id);
    const row = await prisma.payrollEntry.findFirst({ where: { id, stationId: station.id } });
    if (!row) notFound("That payroll entry was not found.");
    await prisma.payrollEntry.delete({ where: { id } });
    return { ok: true };
  }
}

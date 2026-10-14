import { Controller, Get } from "@nestjs/common";
import { Public } from "./auth/session.guard.js";

@Controller("health")
export class HealthController {
  @Public()
  @Get()
  ok() {
    return { ok: true };
  }
}

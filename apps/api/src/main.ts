import { createApp } from "./app.js";
import { env } from "./env.js";

const server = await createApp();
server.listen(env.PORT, () => {
  console.log(`Nines API on http://localhost:${env.PORT}/api`);
});

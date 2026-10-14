import type { Config } from "@react-router/dev/config";

// SPA mode: the build is static files served by AWS Amplify Hosting.
// All data comes from the NestJS API through clientLoader/clientAction.
export default {
  ssr: false,
} satisfies Config;

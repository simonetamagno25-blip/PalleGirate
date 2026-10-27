import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// L'app Next vive in frontend/, ma package.json, node_modules, .env e backend/ stanno nella cartella sopra.
const root = path.resolve(__dirname, "..");
const envFile = path.join(root, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

// next-intl cerca il file rispetto alla cartella corrente: gli script npm lanciano Next da frontend/.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // AGENTS.md sta nella radice del progetto: niente copia generata in frontend/.
  agentRules: false,
  turbopack: {
    root,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);

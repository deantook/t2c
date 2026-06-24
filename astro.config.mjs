import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import { contentBuilder } from "./src/integrations/content-builder.ts";

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  integrations: [react(), tailwind(), contentBuilder()],

  vite: {
    ssr: {
      noExternal: ["marked"],
    },
  },

  adapter: cloudflare()
});
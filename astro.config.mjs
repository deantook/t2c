import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import { contentBuilder } from "./src/integrations/content-builder.ts";

export default defineConfig({
  integrations: [react(), tailwind(), contentBuilder()],
  vite: {
    ssr: {
      noExternal: ["marked"],
    },
  },
});

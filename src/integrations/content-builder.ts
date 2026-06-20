import type { AstroIntegration } from "astro";

export function contentBuilder(): AstroIntegration {
  return { name: "content-builder", hooks: {} };
}

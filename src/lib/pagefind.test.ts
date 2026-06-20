import { describe, it, expect } from "vitest";
import { pagefindUrlToContentPath } from "./pagefind";

describe("pagefindUrlToContentPath", () => {
  it("strips generated articles prefix", () => {
    expect(pagefindUrlToContentPath("/generated/articles/docs/backend/redis-cache-patterns.md.html")).toBe(
      "docs/backend/redis-cache-patterns.md",
    );
  });

  it("handles paths without prefix", () => {
    expect(pagefindUrlToContentPath("/blog/hello-world.md.html")).toBe("blog/hello-world.md");
  });
});

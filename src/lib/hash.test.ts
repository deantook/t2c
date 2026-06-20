import { describe, it, expect } from "vitest";
import { hashToCommand, commandToHash } from "./hash";

describe("hash routing", () => {
  it("parses cat hash", () => {
    expect(hashToCommand("#cat/blog/hello-world.md")).toBe("cat blog/hello-world.md");
  });

  it("parses cd hash", () => {
    expect(hashToCommand("#cd/docs/frontend")).toBe("cd docs/frontend");
  });

  it("generates hash from cat command", () => {
    expect(commandToHash("cat about.md")).toBe("#cat/about.md");
  });
});

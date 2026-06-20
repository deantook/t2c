import { describe, it, expect, beforeEach } from "vitest";
import { getLastRead, setLastRead } from "./last-read";

describe("last-read", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when unset", () => {
    expect(getLastRead()).toBeNull();
  });

  it("stores and retrieves path", () => {
    setLastRead("blog/hello-world.md");
    expect(getLastRead()).toBe("blog/hello-world.md");
  });
});

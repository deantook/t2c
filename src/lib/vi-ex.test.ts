import { describe, it, expect } from "vitest";
import { parseExCommand } from "./vi-ex";

describe("parseExCommand", () => {
  it("quits on :q", () => {
    expect(parseExCommand(":q")).toEqual({ action: "quit" });
  });

  it("quits on :quit and :x", () => {
    expect(parseExCommand(":quit")).toEqual({ action: "quit" });
    expect(parseExCommand(":x")).toEqual({ action: "quit" });
  });

  it("rejects unknown commands", () => {
    const result = parseExCommand(":w");
    expect(result.action).toBe("error");
  });
});

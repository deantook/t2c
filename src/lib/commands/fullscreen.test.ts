import { describe, it, expect } from "vitest";
import { runExitFullscreen, runFullscreen } from "./fullscreen";
import type { CommandContext, TerminalState } from "../types";

const state: TerminalState = { cwd: "~", history: [], output: [] };
const ctx = {} as CommandContext;

describe("runFullscreen", () => {
  it("requests enter by default", () => {
    expect(runFullscreen(state, [], ctx)).toEqual({
      state,
      output: [],
      fullscreenAction: "enter",
    });
  });

  it("requests exit with exit/off arg", () => {
    expect(runFullscreen(state, ["exit"], ctx).fullscreenAction).toBe("exit");
    expect(runFullscreen(state, ["off"], ctx).fullscreenAction).toBe("exit");
  });
});

describe("runExitFullscreen", () => {
  it("requests exit", () => {
    expect(runExitFullscreen(state, [], ctx)).toEqual({
      state,
      output: [],
      fullscreenAction: "exit",
    });
  });
});

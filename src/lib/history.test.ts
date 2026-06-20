import { describe, it, expect, beforeEach } from "vitest";
import { loadHistory, saveHistory, navigateHistory } from "./history";

describe("history", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists commands", () => {
    saveHistory(["ll", "pwd"]);
    expect(loadHistory()).toEqual(["ll", "pwd"]);
  });

  it("navigates up and down", () => {
    const hist = ["a", "b"];
    expect(navigateHistory(hist, -1, hist.length)).toBe("b");
    expect(navigateHistory(hist, -1, 1)).toBe("a");
  });
});

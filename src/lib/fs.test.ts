import { describe, it, expect } from "vitest";
import { mockFs } from "./__fixtures__/fs-tree";
import { normalizeCwd, resolvePath, getDirNode, findFile, listDir } from "./fs";

describe("normalizeCwd", () => {
  it("strips leading ~/", () => {
    expect(normalizeCwd("~/docs")).toBe("docs");
    expect(normalizeCwd("~")).toBe("");
  });
});

describe("resolvePath", () => {
  it("resolves relative paths from cwd", () => {
    expect(resolvePath("~/docs", "frontend")).toBe("~/docs/frontend");
    expect(resolvePath("~/docs/frontend", "..")).toBe("~/docs");
  });

  it("resolves absolute-from-root paths", () => {
    expect(resolvePath("~", "blog")).toBe("~/blog");
  });
});

describe("getDirNode", () => {
  it("finds nested directory", () => {
    const node = getDirNode(mockFs, "~/docs/frontend");
    expect(node?.name).toBe("frontend");
  });

  it("returns null for missing path", () => {
    expect(getDirNode(mockFs, "~/nope")).toBeNull();
  });
});

describe("listDir", () => {
  it("lists root contents", () => {
    const entries = listDir(mockFs, "~");
    expect(entries.map((e) => e.name)).toEqual(["blog", "docs", "about.md"]);
  });
});

describe("findFile", () => {
  it("finds file by name in cwd", () => {
    const file = findFile(mockFs, "~/docs/frontend", "react-hooks.md");
    expect(file?.title).toBe("React Hooks");
  });

  it("finds file by full path", () => {
    const file = findFile(mockFs, "~", "docs/frontend/react-hooks.md");
    expect(file?.path).toBe("docs/frontend/react-hooks.md");
  });
});

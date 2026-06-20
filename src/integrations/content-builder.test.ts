import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("content-builder fs-tree", () => {
  it("includes root-level markdown files in directory children", () => {
    const treePath = path.join(process.cwd(), "public/generated/fs-tree.json");
    const tree = JSON.parse(fs.readFileSync(treePath, "utf-8"));
    const rootFiles = tree.root.children
      .filter((c: { type: string }) => c.type === "file")
      .map((c: { name: string }) => c.name);
    expect(rootFiles).toContain("about.md");
  });

  it("includes nested markdown files in parent directories", () => {
    const treePath = path.join(process.cwd(), "public/generated/fs-tree.json");
    const tree = JSON.parse(fs.readFileSync(treePath, "utf-8"));
    const blog = tree.root.children.find((c: { name: string }) => c.name === "blog");
    const blogFiles = blog.children.map((c: { name: string }) => c.name);
    expect(blogFiles).toContain("hello-world.md");
  });
});

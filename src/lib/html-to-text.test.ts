import { describe, it, expect } from "vitest";
import { htmlToLines } from "./html-to-text";

describe("htmlToLines", () => {
  it("extracts plain text lines from article html", () => {
    const html = `<article><h1>Title</h1><p>Line one</p><p>Line two</p></article>`;
    expect(htmlToLines(html)).toEqual(["Title", "Line one", "Line two"]);
  });
});

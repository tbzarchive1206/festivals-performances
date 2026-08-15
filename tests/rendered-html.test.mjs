import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("builds the self-contained Festivals and Performances archive", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  const assets = await readdir(new URL("../dist/assets/", import.meta.url));
  const scriptName = assets.find((name) => name.endsWith(".js"));
  assert.ok(scriptName, "compiled JavaScript asset is missing");
  const script = await readFile(new URL(`../dist/assets/${scriptName}`, import.meta.url), "utf8");
  assert.match(html, /FESTIVALS (?:&|&amp;) PERFORMANCES/);
  assert.match(html, /\.\/assets\//);
  assert.match(script, /SELECT A COLLECTION/);
  assert.match(script, /SEARCH TITLE OR YYMMDD DATE/);
  assert.match(script, /SETLIST/);
  assert.match(script, /drive\.google\.com\/thumbnail/);
  assert.match(script, /auto-/);
  assert.doesNotMatch(html, /iframe/iu);
});

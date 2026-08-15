import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { ROOT_FOLDER_ID, KCON_SHEET_ID, ROOT_TITLE, summarizeRaw, topLevelFolders } from "../scripts/archive-tools.mjs";

const raw = JSON.parse(await fs.readFile(new URL("../app/data/archive.generated.json", import.meta.url), "utf8"));

test("snapshot contains the complete recursive Drive tree", () => {
  assert.equal(raw.sourceFolderId, ROOT_FOLDER_ID);
  assert.equal(raw.spreadsheetId, KCON_SHEET_ID);
  const summary = summarizeRaw(raw);
  assert.equal(summary.nodes, summary.folders + summary.files);
  assert.equal(new Set(raw.nodes.map((node) => node.id)).size, summary.nodes);
  assert.ok(summary.topFolders > 0);
  assert.ok(summary.yearFolders > 0);
  assert.ok(summary.sheets > 0);
  assert.equal(summary.kconRows, Math.max(0, raw.kconRows.length - 1));
  assert.ok(raw.nodes.every((node) => Array.isArray(node.path) && node.path[0] === ROOT_TITLE));
});

test("top-level folders remain data-driven for automatic category tiles", () => {
  const top = topLevelFolders(raw);
  assert.ok(top.some((folder) => folder.name === "MUSIC SHOWS (음악 방송)"));
  assert.ok(top.some((folder) => folder.name === "2025"));
  assert.ok(top.some((folder) => folder.name.startsWith("KCON")));
});

test("KCON rows carry setlists and additional information", () => {
  assert.deepEqual(raw.kconRows[0], ["콘텐츠명", "날짜", "구글 드라이브 링크", "셋리", "기타"]);
  assert.ok(raw.kconRows.slice(1).every((row) => /^\d{6}$/u.test(row[1])));
  assert.ok(raw.kconRows.some((row) => String(row[3]).includes("Giddy Up")));
});

export const ROOT_FOLDER_ID = "19xetEO82kCf6GjwrkCtzIB2qIA8Sepl3";
export const KCON_SHEET_ID = "1DjxkCu1W7fIYPtToeuWunUsWX5FpVpykGMTWwQLPm7A";
export const ROOT_TITLE = "FESTIVALS & PERFORMANCES";

export function topLevelFolders(raw) {
  return raw.nodes.filter((node) => node.type === "folder" && node.path.length === 1);
}

export function summarizeRaw(raw) {
  const top = topLevelFolders(raw);
  return {
    nodes: raw.nodes.length,
    folders: raw.nodes.filter((node) => node.type === "folder").length,
    files: raw.nodes.filter((node) => node.type === "file").length,
    topFolders: top.length,
    yearFolders: top.filter((node) => /^20\d{2}$/u.test(node.name)).length,
    sheets: raw.nodes.filter((node) => node.mimeType === "application/vnd.google-apps.spreadsheet").length,
    kconRows: Math.max(0, (raw.kconRows || []).length - 1),
  };
}

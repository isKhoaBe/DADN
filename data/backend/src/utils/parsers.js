function parseNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function parseBoolean(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const lower = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(lower)) return true;
  if (["false", "0", "no", "off"].includes(lower)) return false;

  return null;
}

function normalizeText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function normalizeUpper(value, fallback = null) {
  const text = normalizeText(value);
  return text ? text.toUpperCase() : fallback;
}

module.exports = {
  parseNumber,
  parseBoolean,
  normalizeText,
  normalizeUpper
};
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
const mockModeValue = String(process.env.MOCK_MODE || "").trim().toLowerCase();
const isMockMode = mockModeValue === "" ? true : mockModeValue === "true";

module.exports = {
  hasDatabaseUrl,
  isMockMode
};

// ---------------------------------------
// 1. SETTING: หุ้นรายตัว (MASTER WATCHLIST)
// ---------------------------------------

// กลุ่มบิ๊กเทค & ชิป (พื้นฐานแน่น วิ่งแรง)
export const TIER_1_TECH_GIANTS = [
  "MSFT",
  "GOOGL",
  "NVDA",
  "AMZN",
  "META",
  "AAPL",
  "TSLA",
  "TSM",
  "ASML", // ของดี รอจังหวะ
  "AMD", // ของดี รอจังหวะ
  "AVGO",
];

// กลุ่มเติบโตสูง (อนาคตไกล แต่ผันผวนหน่อย)
export const TIER_1_GROWTH = [
  "RKLB", // Rocket Lab รอเก็บของถูก
  "ASTS",
  "SYM",
  "KTOS",
  "MU",
  "SNDK",
  "STX",
];

// กลุ่มพลังงานแห่งอนาคต
export const TIER_1_ENERGY = [
  "UUUU",
  "OKLO", // รอเก็บของถูก
];

// กลุ่มหลุมหลบภัย (Defensive - กินปันผล รอตลาดสงบ)
export const TIER_DEFENSIVE = [
  "KO", // Consumer Staples
  "WMT",
  "PG",
  "COST",
  "JNJ", // Healthcare
  "UNH",
  "PFE",
  "MRK",
  "NEE", // Utilities
  "DUK",
];

// กลุ่มเก็งกำไร (ซิ่งจัด)
export const TIER_2_SPECULATIVE = ["IONQ", "EOSE", "ONDS"];

// ---------------------------------------
// 2. SETTING: รวมลิสต์เพื่อส่งเข้าสแกน
// ---------------------------------------
export const UNIQUE_SYMBOLS = Array.from(
  new Set([
    ...TIER_1_TECH_GIANTS,
    ...TIER_1_GROWTH,
    ...TIER_1_ENERGY,
    ...TIER_DEFENSIVE,
    ...TIER_2_SPECULATIVE, // รวมตัวซิ่งเข้าไปด้วย จะได้สแกนครบทุกตัว
  ]),
);

// ฟังก์ชันเช็คว่าเป็น Tier 1 (ปลอดภัย/เติบโต) หรือไม่
export const isTier1 = (symbol: string) =>
  TIER_1_TECH_GIANTS.includes(symbol) ||
  TIER_1_GROWTH.includes(symbol) ||
  TIER_1_ENERGY.includes(symbol) ||
  TIER_DEFENSIVE.includes(symbol);

// ฟังก์ชันเช็คว่าเป็น Tier 2 (เก็งกำไร) หรือไม่
export const isTier2 = (symbol: string) => TIER_2_SPECULATIVE.includes(symbol);

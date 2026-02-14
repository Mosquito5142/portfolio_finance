// ---------------------------------------
// 1. SETTING: หุ้นรายตัว (MASTER AGGRESSIVE + 4IR & GROWTH WATCHLIST)
// ---------------------------------------

export const MAGNIFICENT_SEVEN = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "NVDA",
  "TSLA",
  "META",
];

// กลุ่ม Mega Tech & Leader (ตัวนำตลาด บิ๊กเทค 4IR - วิ่งตามกระแสเงินทุนหลัก)
export const TIER_1_MEGA_TECH = [
  "NFLX", // 4IR (Streaming Tech)
  "ORCL", // 4IR (Oracle Cloud / Database)
  "AMD", // 4IR (Semiconductors / AI)
  "INTC", // 4IR (Semiconductors)
];

// กลุ่ม AI, Cloud & Cybersecurity (High Growth Software)
export const TIER_1_AI_CLOUD = [
  "PLTR", // AI / Data Analytics
  "CRWD", // Cybersecurity
  "NET", // Cloudflare
  "SNOW", // Data Cloud
  "MDB", // MongoDB
  "RBRK", // Data Security
  "DOCN", // Cloud Infrastructure
  "NBIS", // AI Infrastructure
  "TEM", // AI Healthcare
  "ZS", // 4IR (Zscaler / Cybersecurity)
  "IOT", // 4IR (Samsara / Internet of Things)
];

// กลุ่ม Growth & Deep Tech (4IR / อวกาศ / ชิป / EV Aviation / Fintech)
export const TIER_1_GROWTH_TECH = [
  "ASTS", // Space Mobile
  "IONQ", // Quantum Computing
  "RKLB", // Rocket Lab
  "SOFI", // Fintech
  "SYNA", // Semiconductors
  "NVTS", // Semiconductors
  "AEHR", // Semiconductor testing
  "ALAB", // Semiconductors / AI Connectivity
  "AXON", // Tech / Law Enforcement
  "MU", // 4IR & Growth (Micron / Memory Chips)
  "ARM", // 4IR (Arm Holdings / Chip Architecture)
  "HOOD", // 4IR & Growth (Robinhood / Fintech)
  "KTOS", // Growth (Kratos / Defense & Space)
  "JOBY", // Growth (Joby Aviation / Flying EV)
  "ACHR", // Growth (Archer Aviation / Flying EV)
  "LMND", // Growth (Lemonade / AI Insurtech)
  "PI", // Growth (Impinj / IoT & RFID)
];

// กลุ่ม Healthcare & Biotech (High Risk / Explosive Moves)
export const TIER_1_HEALTH_BIO = [
  "TMDX", // Medical Devices
  "VKTX", // Biotech (GLP-1 Weight loss)
  "CLPT", // Medical Devices
  "PRME", // Biotech / Gene editing
];

// กลุ่มพลังงานแห่งอนาคต & ทรัพยากร (Nuclear / Data Center / Future Metals)
export const TIER_1_ENERGY_RESOURCES = [
  "EOSE", // Energy storage
  "IREN", // Bitcoin Mining / Data Center
  "OKLO", // 4IR & Growth (Nuclear Energy / Sam Altman)
  "COPX", // Growth (Global X Copper Miners ETF - แร่ทองแดงสำหรับทำ AI/EV)
  "CRML", // Growth (Critical Metals Corp - แร่หายาก)
];

// กลุ่มเก็งกำไรจัดจ้าน (Speculative / Drones / Small Cap - เหวี่ยงแรง ต้องคัทลอสไว)
export const TIER_2_SPECULATIVE = [
  "JMIA", // E-commerce (Africa)
  "ONDS", // Drone tech
  "OSS", // Edge computing
  "DPRO", // Growth (Draganfly / Drone tech)
  "INV", // Growth (Speculative)
  "RR", // Growth (Speculative)
];

// ---------------------------------------
// 2. SETTING: รวมลิสต์เพื่อส่งเข้าสแกน
// ---------------------------------------
export const UNIQUE_SYMBOLS = Array.from(
  new Set([
    ...MAGNIFICENT_SEVEN,
    ...TIER_1_MEGA_TECH,
    ...TIER_1_AI_CLOUD,
    ...TIER_1_GROWTH_TECH,
    ...TIER_1_HEALTH_BIO,
    ...TIER_1_ENERGY_RESOURCES,
    ...TIER_2_SPECULATIVE,
  ]),
);

// ฟังก์ชันเช็คว่าเป็น Tier 1 (Fundamental Growth & High Momentum)
export const isTier1 = (symbol: string) =>
  MAGNIFICENT_SEVEN.includes(symbol) ||
  TIER_1_MEGA_TECH.includes(symbol) ||
  TIER_1_AI_CLOUD.includes(symbol) ||
  TIER_1_GROWTH_TECH.includes(symbol) ||
  TIER_1_HEALTH_BIO.includes(symbol) ||
  TIER_1_ENERGY_RESOURCES.includes(symbol);

// ฟังก์ชันเช็คว่าเป็น Tier 2 (เก็งกำไรสูงมาก / เหวี่ยงแรง)
export const isTier2 = (symbol: string) => TIER_2_SPECULATIVE.includes(symbol);

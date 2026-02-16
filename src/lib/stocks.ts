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
  "PANW", // Cybersecurity (Palo Alto Networks)
  "NOW", // AI Enterprise Software (ServiceNow)
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
  "ASML", // Chip Machinery Monopoly (ASML Holding)
  "TSM", // Chip Foundry (Taiwan Semiconductor)
  "AMAT", // Chip Equipment (Applied Materials)
  "KLAC", // Chip Testing (KLA Corp)
  "LRCX", // Chip Manufacturing (Lam Research)
  "CRDO", // AI Networking (Credo Technology)
  "ANET", // AI Networking (Arista Networks)
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
  "CEG", // Clean Energy (Constellation Energy)
  "NEE", // Solar/Wind (NextEra Energy)
  "VST", // Nuclear/Gas Power (Vistra Corp)
  "NNE", // Micro Reactor (Nano Nuclear Energy)
  "SMR", // SMR Reactor (NuScale Power)
  "LEU", // Uranium Fuel (Centrus Energy)
  "CCJ", // Uranium Mining (Cameco)
  "BWXT", // Nuclear Components (BWX Technologies)
  "GEV", // Power Grid (GE Vernova)
  "CIFR", // Bitcoin/Data Center (Cipher Mining)
  "WULF", // Nuclear Bitcoin Mining (TeraWulf)
  "APLD", // AI Data Center (Applied Digital)
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

// คำอธิบายหุ้นรายตัว (สำหรับ Tooltip)
export const STOCK_DETAILS: Record<string, string> = {
  // MAGNIFICENT SEVEN
  AAPL: "Apple Inc. - iPhone, Mac, Services, Vision Pro",
  MSFT: "Microsoft - Windows, Azure Cloud, AI (Copilot/OpenAI)",
  GOOGL: "Alphabet - Google Search, YouTube, Cloud, AI (Gemini)",
  AMZN: "Amazon - E-commerce Leader, AWS Cloud",
  NVDA: "NVIDIA - AI Chips Leader (H100/Blackwell), Data Center",
  TSLA: "Tesla - EV Leader, FSD AI, Optimus Robot, Energy",
  META: "Meta - Facebook, Instagram, WhatsApp, Metaverse/VR",

  // MEGA TECH
  NFLX: "Netflix - Streaming Dominance (4IR)",
  ORCL: "Oracle - Cloud Infrastructure & Database (4IR)",
  AMD: "AMD - CPU/GPU, AI Chips (NI-300), คู่แข่ง Nvidia",
  INTC: "Intel - Chip Foundry (กำลังสร้างโรงงานใหม่), U.S. Gov Support",

  // AI & CLOUD
  PLTR: "Palantir - AI Data Analytics for Gov/Military & Commercial",
  CRWD: "CrowdStrike - Cybersecurity Endpoint Protection Leader",
  NET: "Cloudflare - Cloud Security, CDN, Internet Infrastructure",
  SNOW: "Snowflake - Data Cloud & Warehousing",
  MDB: "MongoDB - NoSQL Database for Modern Apps",
  RBRK: "Rubrik - Data Security & Zero Trust Data Management",
  DOCN: "DigitalOcean - Cloud for Developers/SMBs",
  NBIS: "Nebius - AI Infrastructure (Ex-Yandex)",
  TEM: "Tempus AI - AI Healthcare & Precision Medicine",
  ZS: "Zscaler - Cloud Cybersecurity (Zero Trust)",
  IOT: "Samsara - Internet of Things (IoT) for Operations",
  PANW: "Palo Alto Networks - Cybersecurity Leader (Firewall/Cloud)",
  NOW: "ServiceNow - AI Enterprise Workflow Automation",

  // GROWTH TECH
  ASTS: "AST SpaceMobile - ยิงสัญญาณมือถือจากดาวเทียม (Direct-to-Cell)",
  IONQ: "IonQ - Quantum Computing Leader",
  RKLB: "Rocket Lab - ปล่อยจรวด/ดาวเทียม (คู่แข่ง SpaceX)",
  SOFI: "SoFi - Fintech ครบวงจร (Bank, Invest, Loans)",
  SYNA: "Synaptics - IoT Connectivity & Touch/Display Chips",
  NVTS: "Navitas - GaN Power Chips (ชาร์จเร็ว/ประหยัดไฟ)",
  AEHR: "Aehr Test Systems - เครื่องทดสอบชิป Silicon Carbide (EV)",
  ALAB: "Astera Labs - AI Connectivity Chips (PCIe/CXL)",
  AXON: "Axon - Taser & Body Cameras + AI Software for Police",
  MU: "Micron - Memory Chips (DRAM/HBM) for AI",
  ARM: "Arm Holdings - ออกแบบสถาปัตยกรรมชิป (ใช้ในมือถือทั่วโลก)",
  HOOD: "Robinhood - แอปเทรดหุ้น/Crypto ขวัญใจรายย่อย",
  KTOS: "Kratos - Defense & Security Solutions (Drones)",
  JOBY: "Joby Aviation - Flying EV Taxi (eVTOL)",
  ACHR: "Archer Aviation - Flying EV Taxi (eVTOL)",
  LMND: "Lemonade - AI-Powered Insurance (Insurtech)",
  PI: "Impinj - RAIN RFID & IoT Connectivity",
  ASML: "ASML - เครื่องผลิตชิป EUV เจ้าเดียวในโลก (Monopoly)",
  TSM: "TSMC - โรงงานผลิตชิปที่ใหญ่ที่สุดในโลก (ผลิตให้ Apple/Nvidia)",
  AMAT: "Applied Materials - อุปกรณ์การผลิต Semiconductor",
  KLAC: "KLA Corp - เครื่องตรวจสอบ/Metrology ในการผลิตชิป",
  LRCX: "Lam Research - เครื่องกัด/Etching ในการผลิตชิป",
  CRDO: "Credo - High-Speed Connectivity Solutions for AI",
  ANET: "Arista Networks - AI Cloud Networking Switches",

  // HEALTHCARE
  TMDX: "TransMedics - Organ Transplants (เครื่องรักษาอวัยวะ)",
  VKTX: "Viking Therapeutics - ยาลดความอ้วน (GLP-1) คู่แข่ง LLY/NVO",
  CLPT: "ClearPoint Neuro - Navigation for Brain Surgery",
  PRME: "Prime Medicine - Gene Editing (Prime Editing)",

  // ENERGY & RESOURCES
  EOSE: "EOS Energy - Zinc-based Battery Storage for Grid",
  IREN: "Iris Energy - Bitcoin Mining & AI Data Centers (Renewable)",
  OKLO: "Oklo - Fast Fission Nuclear Reactor (Backed by Sam Altman)",
  COPX: "Global X Copper Miners ETF - กองทุนเหมืองทองแดง (Essential for AI/EV)",
  CRML: "Critical Metals - เหมืองลิเธียมและแร่หายาก",
  CEG: "Constellation Energy - พลังงานสะอาด/นิวเคลียร์รายใหญ่สุดใน US",
  NEE: "NextEra Energy - พลังงานหมุนเวียน (Solar/Wind) ใหญ่ที่สุดในโลก",
  VST: "Vistra - โรงไฟฟ้า IPP รายใหญ่ (Nuclear/Gas/Battery)",
  NNE: "Nano Nuclear Energy - Micro Reactors (Portable)",
  SMR: "NuScale Power - Small Modular Reactor (SMR) Technology",
  LEU: "Centrus Energy - เชื้อเพลิงนิวเคลียร์ (HALEU)",
  CCJ: "Cameco - เหมืองยูเรเนียมใหญ่ที่สุดในโลก",
  BWXT: "BWX Technologies - ชิ้นส่วนนิวเคลียร์/เรือดำน้ำ/Space",
  GEV: "GE Vernova - รวมธุรกิจพลังงาน (Power, Wind, Electrification)",
  CIFR: "Cipher Mining - Bitcoin Mining ระดับอุตสาหกรรม US",
  WULF: "TeraWulf - Zero-Carbon Bitcoin Mining (Nuclear Powered)",
  APLD: "Applied Digital - AI Data Centers Infrastructure",

  // SPECULATIVE
  JMIA: "Jumia - E-commerce of Africa",
  ONDS: "Ondas Holdings - Private Wireless Networks & Drones",
  OSS: "One Stop Systems - AI Edge Computing Hardware",
  DPRO: "Draganfly - Commercial Drones Solutions",
  INV: "Innovation (Speculative Placeholder)",
  RR: "Rich Road (Speculative Placeholder)",
};

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
  AAPL: "Apple - iPhone, Mac, บริการ และ Vision Pro (ผู้นำ Tech โลก)",
  MSFT: "Microsoft - Windows, Azure Cloud และผู้นำ AI (เจ้าของ OpenAI/Copilot)",
  GOOGL: "Alphabet - Google Search, YouTube, Cloud และ AI (Gemini)",
  AMZN: "Amazon - อีคอมเมิร์ซอันดับ 1 และ AWS Cloud (ผู้นำระบบคลาวด์โลก)",
  NVDA: "NVIDIA - ผู้ผลิตชิป AI เบอร์ 1 ของโลก (ชิป H100/Blackwell)",
  TSLA: "Tesla - ผู้นำรถยนต์ไฟฟ้า (EV), AI ขับอัตโนมัติ (FSD) และหุ่นยนต์ Optimus",
  META: "Meta - เจ้าของ Facebook, Instagram, WhatsApp และผู้นำ Metaverse/VR",

  // MEGA TECH
  NFLX: "Netflix - ผู้นำบริการสตรีมมิ่งหนังและซีรีส์ระดับโลก",
  ORCL: "Oracle - ผู้นำด้านฐานข้อมูล (Database) และระบบ Cloud Infrastructure",
  AMD: "AMD - ผู้ผลิตชิป CPU/GPU และ AI (คู่แข่งสำคัญของ Nvidia & Intel)",
  INTC: "Intel - ผู้ผลิตชิปรายใหญ่ (กำลังสร้างโรงงานใหม่เพื่อทวงคืนความยิ่งใหญ่)",

  // AI & CLOUD
  PLTR: "Palantir - ซอฟต์แวร์วิเคราะห์ข้อมูลขั้นสูง (ใช้ในกองทัพสหรัฐฯ & องค์กรตางๆ)",
  CRWD: "CrowdStrike - ผู้นำด้าน Cybersecurity ป้องกันการแฮกที่เครื่องลูกข่าย (Endpoint)",
  NET: "Cloudflare - ผู้ให้บริการระบบความปลอดภัยเว็บไซต์ & CDN (ทำให้เว็บเร็วและปลอดภัย)",
  SNOW: "Snowflake - ระบบจัดการข้อมูลบน Cloud (Data Cloud & Warehousing)",
  MDB: "MongoDB - ฐานข้อมูลยุคใหม่ (NoSQL) ที่แอปฯ สมัยใหม่ต้องใช้",
  RBRK: "Rubrik - ระบบความปลอดภัยข้อมูล & Zero Trust (สำรองข้อมูลกัน Ransomware)",
  DOCN: "DigitalOcean - บริการ Cloud ที่เน้นใช้งานง่ายสำหรับ Developer & SME",
  NBIS: "Nebius - ผู้ให้บริการโครงสร้างพื้นฐาน AI (AI Infrastructure / GPU Cloud)",
  TEM: "Tempus AI - นำ AI มาใช้วิเคราะห์ข้อมูลพันธุกรรมเพื่อการรักษาโรค (Precision Medicine)",
  ZS: "Zscaler - ผู้นำด้าน Cloud Security แบบ Zero Trust (ทำงานที่ไหนก็ปลอดภัย)",
  IOT: "Samsara - เทคโนโลยี Internet of Things (IoT) สำหรับบริหารจัดการฟลีทรถ/เครื่องจักร",
  PANW: "Palo Alto Networks - ผู้นำด้าน Cybersecurity ครบวงจร (Firewall & Cloud Security)",
  NOW: "ServiceNow - แพลตฟอร์ม AI ช่วยจัดการงานในองค์กรให้เป็นอัตโนมัติ (Workflow Automation)",

  // GROWTH TECH
  ASTS: "AST SpaceMobile - ยิงสัญญาณ 5G จากดาวเทียมเข้ามือถือโดยตรง (ไม่ต้องใช้จานรับ)",
  IONQ: "IonQ - ผู้พัฒนาควอนตัมคอมพิวเตอร์ (Quantum Computing) ชั้นนำ",
  RKLB: "Rocket Lab - บริษัทปล่อยจรวดและดาวเทียม (คู่แข่งคนสำคัญของ SpaceX)",
  SOFI: "SoFi - ธนาคารดิจิทัลครบวงจร (กู้ยืม, ลงทุน, ฝากเงิน) สำหรับคนรุ่นใหม่",
  SYNA: "Synaptics - ชิปสำหรับระบบสัมผัส (Touch), การแสดงผล และ IoT Connectivity",
  NVTS: "Navitas - ชิป GaN (Gallium Nitride) ช่วยให้ชาร์จไฟเร็วขึ้นและประหยัดพลังงาน",
  AEHR: "Aehr Test Systems - เครื่องทดสอบชิป Silicon Carbide (สำคัญมากสำหรับ EV)",
  ALAB: "Astera Labs - ชิปช่วยส่งข้อมูลความเร็วสูงให้ AI Server (แก้คอขวดข้อมูล)",
  AXON: "Axon - ผู้ผลิตปืนไฟฟ้า Taser, กล้องติดตัวตำรวจ และซอฟต์แวร์ AI งานศาล",
  MU: "Micron - ผู้ผลิตชิปหน่วยความจำ (Memory/DRAM) ที่จำเป็นสำหรับ AI Server",
  ARM: "Arm Holdings - เจ้าของสถาปัตยกรรมชิปที่ใช้ในสมาร์ทโฟนเกือบทุกเครื่องในโลก",
  HOOD: "Robinhood - แอปเทรดหุ้นและคริปโตยอดนิยมของรายย่อย (UX/UI ใช้งานง่าย)",
  KTOS: "Kratos - ผู้ผลิตโดรนความเร็วสูง (Supersonic Drones) สำหรับซ้อมรบและการทหาร",
  JOBY: "Joby Aviation - แท็กซี่บินได้พลังงานไฟฟ้า (eVTOL) เตรียมเปิดให้บริการ",
  ACHR: "Archer Aviation - แท็กซี่บินได้ (eVTOL) คู่แข่ง Joby (ร่วมมือกับ United Airlines)",
  LMND: "Lemonade - บริษัทประกันภัยยุคใหม่ (Insurtech) ใช้ AI จัดการเคลมรวดเร็ว",
  PI: "Impinj - เทคโนโลยี RAIN RFID เชื่อมต่อสิ่งของเข้ากับอินเทอร์เน็ต (IoT)",
  ASML: "ASML - ผู้ผลิตเครื่องพิมพ์ชิป EUV เพียงเจ้าเดียวในโลก (หัวใจสำคัญของการผลิตชิป)",
  TSM: "TSMC - โรงงานผลิตชิปที่ใหญ่ที่สุดและล้ำสมัยที่สุดในโลก (ผลิตให้ Apple, Nvidia)",
  AMAT: "Applied Materials - ผู้ผลิตเครื่องจักรและอุปกรณ์สำหรับโรงงานผลิตชิป",
  KLAC: "KLA Corp - ผู้เชี่ยวชาญด้านการตรวจสอบความผิดพลาด (Defect Inspection) ในการผลิตชิป",
  LRCX: "Lam Research - ผู้เชี่ยวชาญด้านกระบวนการกัดและเคลือบผิวชิป (Etching/Deposition)",
  CRDO: "Credo - ชิปเชื่อมต่อความเร็วสูง (Connectivity) สำหรับ Data Center และ AI",
  ANET: "Arista Networks - อุปกรณ์เครือข่าย (Switch) ความเร็วสูงสำหรับ Data Center ระดับโลก",

  // HEALTHCARE
  TMDX: "TransMedics - เครื่องเก็บรักษาอวัยวะเพื่อการปลูกถ่าย (หัวใจ/ปอด/ตับ) ให้เหมือนอยู่ในร่างกาย",
  VKTX: "Viking Therapeutics - พัฒนายาลดความอ้วน (GLP-1) คู่แข่งรายใหม่ที่น่าจับตา",
  CLPT: "ClearPoint Neuro - ระบบนำทางสำหรับการผ่าตัดสมองที่มีความแม่นยำสูง",
  PRME: "Prime Medicine - เทคโนโลยีตัดต่อพันธุกรรมรุ่นใหม่ (Prime Editing) แม่นยำกว่า CRISPR",

  // ENERGY & RESOURCES
  EOSE: "EOS Energy - แบตเตอรี่ Zinc-based สำหรับเก็บพลังงานระดับ Grid (ปลอดภัยกว่า Lithium)",
  IREN: "Iris Energy - เหมือง Bitcoin และศูนย์ข้อมูล AI ที่ใช้พลังงานหมุนเวียน 100%",
  OKLO: "Oklo - โรงไฟฟ้านิวเคลียร์ขนาดเล็ก (Micro Reactor) ดีไซน์ล้ำ (Sam Altman ลงทุน)",
  COPX: "Global X Copper Miners ETF - กองทุนรวมบริษัทเหมืองทองแดง (แร่สำคัญของ AI และ EV)",
  CRML: "Critical Metals - เหมืองลิเธียมและแร่ธาตุหายากที่จำเป็นต่อเทคโนโลยี",
  CEG: "Constellation Energy - ผู้ผลิตพลังงานสะอาดและนิวเคลียร์รายใหญ่ที่สุดในสหรัฐฯ",
  NEE: "NextEra Energy - บริษัทพลังงานหมุนเวียน (ลม/แสงอาทิตย์) ที่ใหญ่ที่สุดในโลก",
  VST: "Vistra - ผู้ผลิตไฟฟ้าเอกชนรายใหญ่ (มีการเติบโตในโรงไฟฟ้านิวเคลียร์และแบตเตอรี่)",
  NNE: "Nano Nuclear Energy - พัฒนาเครื่องปฏิกรณ์นิวเคลียร์ขนาดจิ๋ว (พกพาได้)",
  SMR: "NuScale Power - ผู้บุกเบิกเทคโนโลยีโรงไฟฟ้านิวเคลียร์ขนาดเล็ก (SMR)",
  LEU: "Centrus Energy - ผู้ผลิตเชื้อเพลิงยูเรเนียมเข้มข้น (HALEU) สำหรับโรงไฟฟ้ารุ่นใหม่",
  CCJ: "Cameco - บริษัทเหมืองยูเรเนียมที่ใหญ่ที่สุดในโลก (ต้นน้ำของพลังงานนิวเคลียร์)",
  BWXT: "BWX Technologies - ผู้ผลิตชิ้นส่วนนิวเคลียร์ให้กองทัพเรือสหรัฐฯ และโรงไฟฟ้า",
  GEV: "GE Vernova - ยักษ์ใหญ่ด้านโครงสร้างพื้นฐานพลังงาน (กังหันลม, กังหันก๊าซ, ระบบสายส่ง)",
  CIFR: "Cipher Mining - เหมือง Bitcoin ระดับอุตสาหกรรมในสหรัฐฯ",
  WULF: "TeraWulf - เหมือง Bitcoin พลังงานนิวเคลียร์ (Zero-Carbon)",
  APLD: "Applied Digital - ให้บริการศูนย์ข้อมูล (Data Center) สำหรับงาน AI โดยเฉพาะ",

  // SPECULATIVE
  JMIA: "Jumia - แพลตฟอร์มอีคอมเมิร์ซที่ใหญ่ที่สุดในทวีปแอฟริกา (Amazon of Africa)",
  ONDS: "Ondas Holdings - ระบบเครือข่ายไร้สายส่วนตัวและโดรนอัตโนมัติสำหรับอุตสาหกรรม",
  OSS: "One Stop Systems - ฮาร์ดแวร์ประมวลผลประสิทธิภาพสูง (Edge Computing) สำหรับ AI",
  DPRO: "Draganfly - โซลูชั่นโดรนเพื่อการพาณิชย์และการกู้ภัย",
  INV: "Innovation (Speculative Placeholder) - หุ้นเก็งกำไรกลุ่มนวัตกรรม",
  RR: "Rich Road (Speculative Placeholder) - หุ้นเก็งกำไร",
};

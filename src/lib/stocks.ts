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

// กลุ่ม Mega Tech & Leader
export const TIER_1_MEGA_TECH = [
  "NFLX", // 4IR
  "ORCL", // 4IR
  "AMD", // 4IR
  "INTC", // 4IR
  "TSM", // Semi
  "ASML", // Semi Equip
];

// กลุ่ม AI, Cloud & Cybersecurity
export const TIER_1_AI_CLOUD = [
  "PLTR",
  "CRWD",
  "NET",
  "SNOW",
  "MDB",
  "RBRK",
  "DOCN",
  "NBIS",
  "TEM",
  "ZS", // 4IR
  "IOT", // 4IR
  "SHOP", // 4IR
  "MELI",
  "SMCI", // AI Server
];

// กลุ่ม Growth & Deep Tech
export const TIER_1_GROWTH_TECH = [
  "ASTS",
  "IONQ",
  "RKLB",
  "SOFI",
  "SYNA",
  "NVTS",
  "AEHR",
  "ALAB",
  "AXON",
  "MU", // 4IR
  "ARM", // 4IR
  "HOOD", // 4IR
  "KTOS", // Growth
  "JOBY", // Growth
  "ACHR", // Growth
  "LMND", // Growth
  "AVAV", // Growth
  "DPRO", // Growth
  "NOK", // Growth
];

// กลุ่ม Healthcare & Biotech
export const TIER_1_HEALTH_BIO = ["LLY", "TMDX", "VKTX", "CLPT", "PRME"];

// กลุ่มพลังงานแห่งอนาคต & ทรัพยากร
export const TIER_1_ENERGY_RESOURCES = [
  "EOSE",
  "IREN",
  "OKLO", // 4IR & Growth
  "COPX", // Growth
  "CRML", // Growth
  "BWXT", // Growth
];

// 🌟 กลุ่ม Alpha Picks
export const ALPHA_PICKS_WATCHLIST = [
  "APP", // 4IR
];

// กลุ่มเก็งกำไรจัดจ้าน
export const TIER_2_SPECULATIVE = ["JMIA", "ONDS", "OSS"];

export const FINVIZ_WATCHLIST = ["UUUU", "IMVT"];

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
    ...ALPHA_PICKS_WATCHLIST,
    ...TIER_2_SPECULATIVE,
    ...FINVIZ_WATCHLIST,
  ]),
);

export const isTier1 = (symbol: string) =>
  MAGNIFICENT_SEVEN.includes(symbol) ||
  TIER_1_MEGA_TECH.includes(symbol) ||
  TIER_1_AI_CLOUD.includes(symbol) ||
  TIER_1_GROWTH_TECH.includes(symbol) ||
  TIER_1_HEALTH_BIO.includes(symbol) ||
  TIER_1_ENERGY_RESOURCES.includes(symbol) ||
  ALPHA_PICKS_WATCHLIST.includes(symbol) ||
  TIER_2_SPECULATIVE.includes(symbol) ||
  FINVIZ_WATCHLIST.includes(symbol);

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
  PLTR: "Palantir - ซอฟต์แวร์วิเคราะห์ข้อมูลขั้นสูง (ใช้ในกองทัพสหรัฐฯ & องค์กรต่างๆ)",
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
  SHOP: "Shopify - แพลตฟอร์มอีคอมเมิร์ซสำหรับสร้างร้านค้าออนไลน์แบบครบวงจร",
  MELI: "MercadoLibre - แพลตฟอร์มอีคอมเมิร์ซและการชำระเงินที่ใหญ่ที่สุดในละตินอเมริกา",

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
  AVAV: "AeroVironment - โดรนทางการทหารและระบบยานยนต์ไร้คนขับ",
  DPRO: "Draganfly - โซลูชั่นโดรนเพื่อการพาณิชย์และการกู้ภัย",
  NOK: "Nokia - ผู้ผลิตอุปกรณ์เครือข่าย 5G และเทคโนโลยีโทรคมนาคม",

  // HEALTHCARE
  LLY: "Lilly - ผู้ผลิตยาลดความอ้วน (GLP-1) คู่แข่งรายใหม่ที่น่าจับตา",
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
  BWXT: "BWX Technologies - ผู้ผลิตเตาปฏิกรณ์นิวเคลียร์ขนาดเล็กสำหรับกองทัพเรือสหรัฐฯ และพลังงานสะอาด",

  // ALPHA PICKS
  APP: "AppLovin - ซอฟต์แวร์ AI โฆษณาและสร้างรายได้จากแอปพลิเคชัน (Alpha Picks ท็อปฟอร์ม)",

  // SPECULATIVE
  JMIA: "Jumia - แพลตฟอร์มอีคอมเมิร์ซที่ใหญ่ที่สุดในทวีปแอฟริกา (Amazon of Africa)",
  ONDS: "Ondas Holdings - ระบบเครือข่ายไร้สายส่วนตัวและโดรนอัตโนมัติสำหรับอุตสาหกรรม",
  OSS: "One Stop Systems - ฮาร์ดแวร์ประมวลผลประสิทธิภาพสูง (Edge Computing) สำหรับ AI",
  RR: "Rich Road (Speculative Placeholder) - หุ้นเก็งกำไร",
  // FINVIZ WATCHLIST
  UUUU: "Energy Fuels Inc จิ๊กซอว์นิวเคลียร์",
  REGN: "Regeneron - ผู้ผลิตยาลดความอ้วน (GLP-1) คู่แข่งรายใหม่ที่น่าจับตา",
  IMVT: "IMVU - แพลตฟอร์มการสร้างตัวละคร 3D (VR) สำหรับการสื่อสารและเกม",
  PBW: "Pebblebrook Holdings - ผู้เช่าพื้นที่สำหรับ AI Server และ AI Data Center",
  SNDX: "Sanderson Farms - ผู้ผลิตเนื้อสัตว์สำหรับ AI Server และ AI Data Center",
};

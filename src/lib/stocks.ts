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

// กลุ่ม Mega Tech & Leader (อิงจาก Magnificent 7 แต่ขยายผล)
export const TIER_1_MEGA_TECH = [
  "NFLX", // 4IR
  "ORCL", // 4IR
];

// 🛠️ หมวดหมู่ใหม่: AI Hardware, Semiconductors & Infrastructure
export const TIER_1_AI_HARDWARE = [
  "AVGO", // Broadcom - Networking chips for AI (Tier 1)
  "AMD", // 4IR - CPU/GPU
  "TSM", // Semi - Foundry
  "ASML", // Semi Equip - EUV
  "QCOM", // Qualcomm - Edge AI/Mobile AI
  "INTC", // 4IR - CPU
  "ARM", // 4IR - ชิปสถาปัตยกรรม (ย้ายมาจาก Growth)
];

// 🌐 หมวดหมู่ใหม่: AI Data Center & Equipment
export const TIER_1_AI_INFRASTRUCTURE = [
  "ANET", // Arista Networks - AI Networking (Tier 1)
  "DELL", // AI Servers (Tier 1)
  "SMCI", // AI Server
  "HPE", // Hewlett Packard Enterprise - AI Servers / Liquid Cooling
  "VRT", // Vertiv - AI Data Center Power & Cooling (Tier 1)
  "FN", // AI Optical Transceivers
];

// ☁️ หมวดหมู่ AI Software, Cloud & Cybersecurity
export const TIER_1_AI_SOFTWARE = [
  "PLTR",
  "CRWD",
  "PANW",
  "NET",
  "SNOW",
  "NOW",
  "MDB",
  "RBRK",
  "DOCN",
  "NBIS",
  "TEM",
  "ZS", // 4IR
  "IOT", // 4IR
  "SHOP", // 4IR
  "MELI",
];

// 🚀 กลุ่ม Growth & Deep Tech
export const TIER_1_GROWTH_TECH = [
  "PYPL",
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
  "HOOD", // 4IR
  "ONTO", // Semi Equip
  "KTOS", // Growth
  "JOBY", // Growth
  "ACHR", // Growth
  "LMND", // Growth
  "AVAV", // Growth
  "DPRO", // Growth
  "NOK", // Growth
];

// กลุ่ม Healthcare & Biotech
export const TIER_1_HEALTH_BIO = [
  "ISRG",
  "INMD",
  "UTHR",
  "LLY",
  "TMDX",
  "VKTX",
  "CLPT",
  "PRME",
  "RXRX",
];

// กลุ่มพลังงานแห่งอนาคต & ทรัพยากร
export const TIER_1_ENERGY_RESOURCES = [
  "FLNC",
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

export const FINVIZ_WATCHLIST = ["UUUU", "IMVT", "BTC-USD"];

// 🎯 กองพลซุ่มยิง (AI Hidden Gems & Deep Tech Supply Chain)
export const AI_HIDDEN_GEMS = [
  "SNPS", // 🎨 Electronic Design Automation (EDA)
  "COHU", // 🔬 Testing
  "ROG", // ❄️ Thermal Management
  "ASPN", // ❄️ Thermal Management
  "CRDO", // 📶 Silicon Photonics
  "AAOI", // 📶 Silicon Photonics
];

// ---------------------------------------
// 2. SETTING: รวมลิสต์เพื่อส่งเข้าสแกน
// ---------------------------------------
export const UNIQUE_SYMBOLS = Array.from(
  new Set([
    ...MAGNIFICENT_SEVEN,
    ...TIER_1_MEGA_TECH,
    ...TIER_1_AI_HARDWARE,
    ...TIER_1_AI_INFRASTRUCTURE,
    ...TIER_1_AI_SOFTWARE,
    ...TIER_1_GROWTH_TECH,
    ...TIER_1_HEALTH_BIO,
    ...TIER_1_ENERGY_RESOURCES,
    ...ALPHA_PICKS_WATCHLIST,
    ...TIER_2_SPECULATIVE,
    ...FINVIZ_WATCHLIST,
    ...AI_HIDDEN_GEMS,
  ]),
);

export const isTier1 = (symbol: string) =>
  MAGNIFICENT_SEVEN.includes(symbol) ||
  TIER_1_MEGA_TECH.includes(symbol) ||
  TIER_1_AI_HARDWARE.includes(symbol) ||
  TIER_1_AI_INFRASTRUCTURE.includes(symbol) ||
  TIER_1_AI_SOFTWARE.includes(symbol) ||
  TIER_1_GROWTH_TECH.includes(symbol) ||
  TIER_1_HEALTH_BIO.includes(symbol) ||
  TIER_1_ENERGY_RESOURCES.includes(symbol) ||
  ALPHA_PICKS_WATCHLIST.includes(symbol) ||
  TIER_2_SPECULATIVE.includes(symbol) ||
  FINVIZ_WATCHLIST.includes(symbol) ||
  AI_HIDDEN_GEMS.includes(symbol);

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

  // 🛠️ AI HARDWARE & SEMICONDUCTORS
  AVGO: "Broadcom - ชิป Networking และ Custom AI Chips พื้นฐานสำคัญของ Data Center (คู่หู Nvidia)",
  AMD: "AMD - ผู้ผลิตชิป CPU/GPU และ AI (คู่แข่งสำคัญของ Nvidia & Intel)",
  INTC: "Intel - ผู้ผลิตชิปรายใหญ่ (กำลังสร้างโรงงานใหม่เพื่อทวงคืนความยิ่งใหญ่)",
  TSM: "TSMC - โรงงานรับผลิตชิป (Foundry) อันดับ 1 ของโลก (ผลิตให้ Apple, Nvidia, AMD)",
  ASML: "ASML - ผู้ผลิตเครื่องพิมพ์ลายวงจรชิป EUV เจ้าเดียวในโลก (ผูกขาดเทคโนโลยีต้นน้ำ)",
  QCOM: "Qualcomm - ผู้นำชิปมือถือและการนำ AI ลงสู่ Edge Devices (AI PC & AI Phones)",
  ARM: "Arm Holdings - เจ้าของสถาปัตยกรรมชิปที่ใช้ในสมาร์ทโฟนเกือบทุกเครื่องในโลก และ AI Servers",

  // 🌐 AI INFRASTRUCTURE & DATA CENTER
  ANET: "Arista Networks - อุปกรณ์เครือข่ายสวิตช์ความเร็วสูง (Ethernet) ที่ใช้ใน AI Data Center",
  DELL: "Dell - ผู้ผลิต AI Servers โซลูชั่นระดับองค์กรครบวงจรรายใหญ่",
  SMCI: "Super Micro Computer - ผู้ผลิต AI Servers ระดับ High-End พร้อมระบบระบายความร้อน (Liquid Cooling)",
  HPE: "Hewlett Packard Ent - ระบบ Cloud แบบ Hybrid และ Enterprise AI Servers",
  VRT: "Vertiv - ระบบจัดการพลังงานและระบายความร้อนอันดับ 1 สำหรับ AI Data Center",
  FN: "Fabrinet - ผู้ผลิตอุปกรณ์เชื่อมต่อทางแสงความเร็วสูง (Optical Communication) รับจ้างผลิตให้ Nvidia",

  // ☁️ AI SOFTWARE, CLOUD & CYBERSECURITY
  PLTR: "Palantir - ซอฟต์แวร์วิเคราะห์ข้อมูลเชิงลึกใช้ในระดับองค์กรใหญ่และกองทัพสหรัฐฯ",
  CRWD: "CrowdStrike - ผู้นำด้าน Cybersecurity ระดับองค์กร (ระบบ Subscription โตยาวๆ)",
  PANW: "Palo Alto Networks - ผู้นำด้าน Cybersecurity ครบวงจร ทั้ง Cloud & Network",
  NET: "Cloudflare - ผู้ให้บริการระบบความปลอดภัยเว็บไซต์ & CDN (ทำให้เว็บเร็วและปลอดภัย)",
  SNOW: "Snowflake - ระบบจัดการข้อมูลบน Cloud (Data Cloud & Warehousing)",
  NOW: "ServiceNow - AI & Cloud Platform สำหรับการจัดการเวิร์กโฟลว์ระดับองค์กร",
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
  PYPL: "PayPal - หุ้นสาย Value พื้นฐานเงินสดมหาศาล (ราชาแห่งความ Oversold)",
  ASTS: "AST SpaceMobile - โครงการแพร่ภาพเน็ตจากดาวเทียมตรงเข้ามือถือ (จับมือ AT&T)",
  IONQ: "IonQ - ผู้พัฒนาควอนตัมคอมพิวเตอร์ (Quantum Computing) ชั้นนำ",
  RKLB: "Rocket Lab - บริษัทปล่อยจรวดและดาวเทียม (คู่แข่งคนสำคัญของ SpaceX)",
  SOFI: "SoFi - ธนาคารดิจิทัลครบวงจร (กู้ยืม, ลงทุน, ฝากเงิน) สำหรับคนรุ่นใหม่",
  SYNA: "Synaptics - ชิปสำหรับระบบสัมผัส (Touch), การแสดงผล และ IoT Connectivity",
  NVTS: "Navitas - ชิป GaN (Gallium Nitride) ช่วยให้ชาร์จไฟเร็วขึ้นและประหยัดพลังงาน",
  AEHR: "Aehr Test Systems - เครื่องทดสอบชิป Silicon Carbide (สำคัญมากสำหรับ EV)",
  ALAB: "Astera Labs - ชิปช่วยส่งข้อมูลความเร็วสูงให้ AI Server (แก้คอขวดข้อมูล)",
  AXON: "Axon - ผู้ผลิตปืนไฟฟ้า Taser, กล้องติดตัวตำรวจ และซอฟต์แวร์ AI งานศาล",
  MU: "Micron - ผู้ผลิตชิปหน่วยความจำ (Memory/HBM) ที่จำเป็นสำหรับ AI Server",
  HOOD: "Robinhood - แอปเทรดหุ้นและคริปโตยอดนิยมของรายย่อย (UX/UI ใช้งานง่าย)",
  ONTO: "Onto Innovation - เซ็นเซอร์ตรวจจับความลึกชิป 3D (TSV) ราคาเพิ่งปรับฐานรุนแรง มีช่องว่างมูลค่า (Valuation Gap) น่าเข้าช้อน",
  KTOS: "Kratos - ผู้ผลิตโดรนความเร็วสูง (Supersonic Drones) สำหรับซ้อมรบและการทหาร",
  JOBY: "Joby Aviation - แท็กซี่บินได้พลังงานไฟฟ้า (eVTOL) เตรียมเปิดให้บริการ",
  ACHR: "Archer Aviation - แท็กซี่บินได้ (eVTOL) คู่แข่ง Joby (ร่วมมือกับ United Airlines)",
  LMND: "Lemonade - บริษัทประกันภัยยุคใหม่ (Insurtech) ใช้ AI จัดการเคลมรวดเร็ว",
  AVAV: "AeroVironment - โดรนทางการทหารและระบบยานยนต์ไร้คนขับ",
  DPRO: "Draganfly - โซลูชั่นโดรนเพื่อการพาณิชย์และการกู้ภัย",
  NOK: "Nokia - ผู้ผลิตอุปกรณ์เครือข่าย 5G และเทคโนโลยีโทรคมนาคม",

  // HEALTHCARE
  ISRG: "Intuitive Surgical - ราชาแห่งหุ่นยนต์ผ่าตัด (Da Vinci) ผูกขาดโรงพยาบาลทั่วโลก",
  INMD: "InMode - อุปกรณ์การแพทย์เสริมความงาม (Margin สูง และ ปลอดหนี้)",
  UTHR: "United Therapeutics - ไบโอเทค PE ต่ำ พื้นฐานแน่น กำไรเติบโตสม่ำเสมอ",
  LLY: "Lilly - ผู้ผลิตยาลดความอ้วน (GLP-1) คู่แข่งรายใหม่ที่น่าจับตา",
  TMDX: "TransMedics - เครื่องเก็บรักษาอวัยวะเพื่อการปลูกถ่าย (หัวใจ/ปอด/ตับ) ให้เหมือนอยู่ในร่างกาย",
  VKTX: "Viking Therapeutics - พัฒนายาลดความอ้วน (GLP-1) คู่แข่งรายใหม่ที่น่าจับตา",
  CLPT: "ClearPoint Neuro - ระบบนำทางสำหรับการผ่าตัดสมองที่มีความแม่นยำสูง",
  PRME: "Prime Medicine - เทคโนโลยีตัดต่อพันธุกรรมรุ่นใหม่ (Prime Editing) แม่นยำกว่า CRISPR",
  RXRX: "Recursion Pharmaceuticals - Techbio ใช้ AI ค้นพบยาใหม่ (Nvidia ลงทุน)",

  // ENERGY & RESOURCES
  FLNC: "Fluence - ระบบกักเก็บพลังงานสเกลใหญ่ระดับ Grid แบ็กอัปโดย Siemens / AES",
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
  "BTC-USD": "Bitcoin (BTC/USD) - สกุลเงินดิจิทัลอันดับ 1 ของโลก",

  // 🔥 AI HIDDEN GEMS (4 กองพลซุ่มยิง)
  SNPS: "Synopsys - 🌟 ผูกขาดซอฟต์แวร์ออกแบบชิป (EDA) ระดับโลก AI ชิปทุกตัวต้องใช้โปรแกรมของ SNPS สร้าง",
  COHU: "Cohu, Inc. - มีเครื่องตรวจชิป HBM แบบ 6 มิติ แต่ตลาดยังตีราคาเป็นแค่หุ้นชิปทั่วไป เลยราคาถูกซ่อนอยู่",
  ROG: "Rogers Corp - 🌟 S-Class ผู้ผลิตวัสดุจัดการความร้อนสำหรับระบบลิควิดคูลลิ่งใน Data Center AI",
  ASPN: "Aspen Aerogels - ผลิตฉนวนแอโรเจลที่บางและกันความร้อนได้ดีที่สุด ป้องกันน้ำควบแน่นในเซิร์ฟเวอร์",
  CRDO: "Credo Technology - สายทองแดงและอุปกรณ์เชื่อมต่อสำหรับเซิร์ฟเวอร์ AI (P/S แค่ 17 เท่า ถูกกว่าคู่แข่ง)",
  AAOI: "Applied Optoelectronics - ซิลิคอนโฟโตนิกส์และตัวรับส่งแสง มีโรงงานในอเมริกา (Domestic U.S. Manufacturing) ได้เปรียบเวลาหนีจีน",
};

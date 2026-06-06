# Portfolio V2 Redesign Plan

## 1. Goal Description
สร้างหน้าจอแสดงผลพอร์ตการลงทุนเวอร์ชันใหม่ (`/portfolio/v2`) โดยเน้นที่การนำเสนอแบบเปรียบเทียบกลยุทธ์ (Side-by-Side), มีดีไซน์แนว Minimalist Black-Gray, และสามารถตั้งค่าสัดส่วนเป้าหมายได้จากหน้าจอโดยตรงไม่ต้องแก้โค้ด

## 2. Requirements & Aesthetics
- **First Focus**: แสดงผลรวมที่สำคัญที่สุดคือ "เงินลงทุนสุทธิ", "มูลค่าพอร์ตปัจจุบัน", และกราฟวงกลม 2 ตัว (ทัพหลวง เทียบกับ กล้าตาย) ที่โชว์กำไรขาดทุน
- **Layout**: สไตล์ Sidebar (เมนูด้านข้าง และคอนเทนต์หลักด้านขวา)
- **Features**: 
  - สามารถตั้งค่าสัดส่วนเป้าหมายพอร์ต (Target Allocations) เช่น 40/40/20 ได้จาก UI และจำค่าไว้ (เช่น ลง LocalStorage หรือ Database)
  - เปรียบเทียบ 2 พอร์ต (พอร์ตหลัก vs เติบโต) แบบคู่กัน
- **Aesthetic**: Minimalist ดำ-เทา (คุมโทนเคร่งขรึม เรียบง่าย เป็นทางการ ลดการใช้สีสันฉูดฉาดแบบ Cyberpunk)
- **Table Structure**: สไตล์โปรแกรม Excel (Data-heavy, แถวชิดกัน, เห็นข้อมูลเยอะๆ ในจอเดียว, เรียบง่ายแต่อ่านค่าได้แม่นยำ)

## 3. Proposed Architecture & Files

### `src/app/portfolio/v2/page.tsx`
- **Main Container**: ใช้โครงสร้าง Flex/Grid โดยมี `Sidebar` ชิดซ้าย และ `Main Content` อยู่ตรงกลาง
- **Sidebar**: สำหรับใส่ตัวควบคุมต่างๆ เช่น การสลับพอร์ต, การตั้งค่าสัดส่วนเป้าหมาย (Target %), และเมนูนำทาง
- **Main Content**:
  - **Top Row**: การ์ดแสดง "เงินลงทุนสุทธิ" และ "มูลค่าปัจจุบัน" สไตล์ Minimal
  - **Chart Row**: กราฟวงกลม 2 ตัวคู่ซ้ายขวา (Main Portfolio vs Growth Portfolio)
  - **Data Table**: ตารางหุ้นแบบ Excel-style (Dense padding, เส้นขอบบาง, ข้อความชัดเจน)

## 4. Agent Assignments
- **`project-planner`**: วางแผนงานโครงสร้าง
- **`frontend-specialist`**: รับผิดชอบงานสร้าง UI, กราฟ, รูปแบบ Layout และคุมธีม Minimalist ดำ-เทา

## 5. Task Breakdown

- `[ ]` **Phase 1: Foundation & Setup**
  - สร้างโฟลเดอร์และไฟล์ `src/app/portfolio/v2/page.tsx`
  - ย้ายและนำเข้า Logic การดึงข้อมูล/คำนวณ PnL จากเวอร์ชันแรกมาปรับใช้
  - สร้างระบบ State และ LocalStorage สำหรับเก็บค่า Target Allocation (แทนการฝังในโค้ด)

- `[ ]` **Phase 2: UI Layout & Sidebar**
  - สร้างโครงสร้าง Sidebar Layout สีดำ-เทา
  - วางโซน Top Row สำหรับสรุปตัวเลขเงินลงทุนสุทธิและมูลค่าพอร์ต

- `[ ]` **Phase 3: Comparison Charts**
  - นำ Component กราฟมาแสดงคู่กัน 2 ตัว (ทัพหลวง vs กล้าตาย)
  - ดึงข้อมูลกำไรขาดทุน (PnL) มาแสดงผลกำกับกราฟวงกลมแต่ละวงในสไตล์ที่เรียบหรู

- `[ ]` **Phase 4: Excel-style Data Grid**
  - เขียนตาราง HTML ธรรมดาแต่จัด CSS สไตล์ Excel (ตารางติดกัน, Header ล็อกตายตัวเมื่อเลื่อนจอ, แสดง Data แบบเจาะลึก)
  - คุมโทนสีในตารางให้เป็นสีเทา/ขาว/ดำ (ยกเว้นตัวเลข PnL ที่จำเป็นต้องแสดง แดง/เขียว ให้ใช้โทนสีที่นุ่มนวล)

- `[ ]` **Phase 5: Refinement & Testing**
  - ทดสอบระบบการบันทึกสัดส่วนพอร์ต
  - ตรวจสอบความถูกต้องของตัวเลขกำไร/ขาดทุน
  - ปรับความ Responsive บนหน้าจอขนาดต่างๆ

## 6. Verification Checklist
- [ ] เปิดหน้า `/portfolio/v2` แล้วโหลดข้อมูลได้ครบถ้วน
- [ ] โทนสีเป็นแบบ Minimalist ดำ-เทา ตามที่ตกลงไว้
- [ ] สามารถปรับ Target Allocation (%) ได้ผ่านหน้าจอ
- [ ] มีตารางข้อมูลสไตล์ Excel แสดงรายการหุ้นทั้งหมด

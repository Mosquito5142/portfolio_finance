// ดึงคลังหุ้นฝั่ง server (สำหรับ API routes ที่สแกนหุ้น)
// อ่านจาก Google Sheet (Stock_Master) ตรงๆ ถ้าไม่ได้ค่อย fallback ไปลิสต์ในโค้ด
import { CODE_STOCK_LIST } from "./stockList";

export async function getServerSymbols(): Promise<string[]> {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (scriptUrl) {
    try {
      const res = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "STOCKS_GET" }),
        cache: "no-store",
      });
      const json = await res.json();
      if (
        json?.status === "success" &&
        Array.isArray(json.data) &&
        json.data.length > 0
      ) {
        return json.data
          .map((e: any) => String(e.symbol).toUpperCase().trim())
          .filter(Boolean);
      }
    } catch {
      /* fallback ด้านล่าง */
    }
  }
  return CODE_STOCK_LIST.map((e) => e.symbol);
}

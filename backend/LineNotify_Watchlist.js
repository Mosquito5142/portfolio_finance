// ========================================
// ⚙️ CONFIGURATION
// ========================================
var LINE_ACCESS_TOKEN = ""; // ใส่ Token ของคุณ
var SHEET_NAME = "LineNotify_Watchlist";

// ========================================
// 🕒 ฟังก์ชันเช็คราคาและแจ้งเตือน (Main Loop) - แบบรวมบิลส่งทีเดียว!
// ========================================
function checkPriceAndNotify() {
  var now = new Date();
  var day = now.getDay();
  var hour = now.getHours();
  var minute = now.getMinutes();

  if (day === 0 || day === 6) {
    Logger.log("😴 วันหยุดตลาดปิด (Weekend)");
    return;
  }

  var isMarketOpen = false;
  if (hour >= 21) {
    if (hour === 21 && minute < 30) {
      isMarketOpen = false;
    } else {
      isMarketOpen = true;
    }
  } else if (hour < 4) {
    isMarketOpen = true;
  }

  if (!isMarketOpen) {
    Logger.log("💤 นอกเวลาทำการ");
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var dataRange = sheet.getRange(2, 1, lastRow - 1, 7);
  var data = dataRange.getValues();

  // 🛒 1. สร้าง "ตะกร้า" มารอเก็บข้อความและข้อมูลแถวที่ต้องอัปเดต
  var pendingAlerts = [];

  data.forEach(function (row, index) {
    var symbol = row[0];
    var entryPrice = row[1];
    var currentPrice = row[2];
    var status = row[4];
    var cutLossPrice = row[5];
    var targetPrice = row[6];

    if (currentPrice === "#N/A" || currentPrice === "Loading...") return;

    var rowNum = index + 2;
    var message = "";
    var newStatus = "";

    var buyBuffer = entryPrice * 1.01;

    // 🟢 เก็บใส่ตะกร้า: BUY
    if (
      currentPrice <= buyBuffer &&
      currentPrice > cutLossPrice &&
      status !== "SENT_ENTRY"
    ) {
      message =
        "🟢 BUY: " +
        symbol +
        " | ราคา: $" +
        currentPrice +
        " (รับ: $" +
        entryPrice +
        ")";
      newStatus = "SENT_ENTRY";
    }

    // ถ้ามีสัญญาณ ให้ดันใส่ตะกร้าไว้ก่อน (ยังไม่ส่ง LINE)
    if (message !== "") {
      pendingAlerts.push({
        rowNum: rowNum,
        status: newStatus,
        text: message,
      });
    }
  });

  // 🚀 2. เช็คว่าในตะกร้ามีของไหม? ถ้ามี ให้แพ็ครวมกันแล้วยิง LINE นัดเดียว!
  if (pendingAlerts.length > 0) {
    // สร้างหัวข้อความ
    var finalMessage = "🎯 สรุปสัญญาณ SNIPER 🎯\n" + "----------------------\n";

    // เอาข้อความย่อยๆ มาต่อกัน บรรทัดต่อบรรทัด
    for (var i = 0; i < pendingAlerts.length; i++) {
      finalMessage += pendingAlerts[i].text + "\n";
    }

    finalMessage += "----------------------\n⚡ รีบเปิดแอปด่วน!";

    // ยิง LINE แค่ 1 ครั้งถ้วน!
    var success = sendLineMessagingAPI(finalMessage);

    // 📝 3. ถ้าส่งสำเร็จ ค่อยวนกลับไปอัปเดตสถานะใน Sheet ว่าส่งแล้ว
    if (success) {
      pendingAlerts.forEach(function (alert) {
        sheet.getRange(alert.rowNum, 5).setValue(alert.status);
      });
      Logger.log(
        "✅ ยิง LINE รวมมิตรสำเร็จ! จำนวน " + pendingAlerts.length + " สัญญาณ",
      );
    }
  }
}

// ========================================
// 📤 ฟังก์ชันยิง LINE (Messaging API - Broadcast)
// ========================================
function sendLineMessagingAPI(message) {
  var url = "https://api.line.me/v2/bot/message/broadcast";
  var payload = {
    messages: [{ type: "text", text: message }],
  };

  var options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + LINE_ACCESS_TOKEN, // ดึง Token จากบรรทัดบนสุดของไฟล์คุณ
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    if (code !== 200) {
      Logger.log("LINE Error: " + response.getContentText());
    }
    return code === 200;
  } catch (e) {
    Logger.log("Exception: " + e.toString());
    return false;
  }
}
// ========================================
// 📥 doPost() - รับข้อมูลจาก Sniper Bot (อัปเดตใหม่)
// ========================================
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  // ... (ส่วนเช็ค Error เหมือนเดิม) ...

  try {
    var json = JSON.parse(e.postData.contents);
    var items = json.items; // รับเป็น Array

    // อ่านข้อมูลเดิม
    var lastRow = sheet.getLastRow();
    var existingTickers = {}; // ใช้ Object เก็บเพื่อความเร็ว { "AAPL": 5, "TSLA": 6 }

    if (lastRow >= 2) {
      var vals = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < vals.length; i++) {
        existingTickers[vals[i][0]] = i + 2;
      }
    }

    items.forEach(function (item) {
      var ticker = item.ticker;
      var entry = item.entry;
      var cut = item.cut;
      var target = item.target;

      var rowToUpdate;

      if (existingTickers[ticker]) {
        // อัปเดตแถวเดิม
        rowToUpdate = existingTickers[ticker];
        // รีเซ็ตสถานะแจ้งเตือน ถ้า Entry Price เปลี่ยนไปเกิน 2% (แปลว่าเป็นรอบใหม่)
        // หรือจะรีเซ็ตทุกครั้งที่สแกนใหม่ก็ได้
        sheet.getRange(rowToUpdate, 5).setValue("");
      } else {
        // เพิ่มแถวใหม่
        rowToUpdate = sheet.getLastRow() + 1;
        sheet.getRange(rowToUpdate, 1).setValue(ticker); // A
        sheet
          .getRange(rowToUpdate, 3)
          .setFormula("=GOOGLEFINANCE(A" + rowToUpdate + ")"); // C: Price
        sheet
          .getRange(rowToUpdate, 4)
          .setFormula(
            "=(C" + rowToUpdate + "-B" + rowToUpdate + ")/B" + rowToUpdate + "",
          ); // D: % Diff
      }

      // อัปเดตค่าต่างๆ (B, F, G)
      sheet.getRange(rowToUpdate, 2).setValue(entry); // B: Entry
      sheet.getRange(rowToUpdate, 6).setValue(cut); // F: Cut Loss (เพิ่มใหม่)
      sheet.getRange(rowToUpdate, 7).setValue(target); // G: Target (เพิ่มใหม่)
    });

    return ContentService.createTextOutput(JSON.stringify({ success: true }));
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: err.toString() }),
    );
  }
}

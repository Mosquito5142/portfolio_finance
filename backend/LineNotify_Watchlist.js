// ========================================
// ⚙️ CONFIGURATION
// ========================================
var LINE_ACCESS_TOKEN = ""; // ใส่ Token ของคุณ
var SHEET_WATCHLIST = "LineNotify_Watchlist";
var SHEET_PORTFOLIO = "Portfolio"; // ชีตรวมพอร์ตทั้งหมด (แบ่งหมวดด้วยคอลัมน์ N=Group)
var SHEET_PORTFOLIO_GROUPS = "Portfolio_groups"; // config สัดส่วนเป้าหมายของแต่ละหมวด
// ── ชีตเก่า: เก็บไว้เป็น backup + ให้ PORTFOLIO_GET fallback ไปอ่านได้ถ้ายังไม่ได้ migrate ──
var SHEET_PORTFOLIO_MAIN = "Portfolio_main";
var SHEET_PORTFOLIO_GROWTH = "Portfolio_growth";
var SHEET_STOCKS = "Stock_Master"; // คลังหุ้นกลาง (Symbol, Category, Detail)

// หมวดตั้งต้น เพิ่ม/ลบ/แก้ทีหลังได้ผ่าน GROUPS_SET หรือแก้ในชีต Portfolio_groups ตรง ๆ
var DEFAULT_GROUPS = [
  ["ai_physical", "AI ฟิสิคอล", 0, 1],
  ["space", "อวกาศ", 0, 2],
  ["drone", "โดรน", 0, 3],
  ["health", "สุขภาพ", 0, 4],
  ["quantum", "ควอนตัม", 0, 5],
  ["fintech", "การเงิน/ฟินเทค", 0, 6],
  ["bigtech", "เทคใหญ่/แพลตฟอร์ม", 0, 7],
  ["other", "อื่นๆ", 0, 8],
];

// หัวตารางชีต Portfolio — A ถึง O
var PORTFOLIO_HEADERS = [
  "Date", "Symbol", "Action", "Quantity", "Price", "CutLoss", "Target",
  "SoldDate", "SoldQty", "SoldPrice", "Status", "CurrentPrice", "TargetAlloc",
  "Group", "LegacyStrategy",
];

// สร้างชีต Stock_Master ถ้ายังไม่มี (พร้อมหัวตาราง)
function getOrCreateStocksSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_STOCKS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_STOCKS);
    sheet.appendRow(["Symbol", "Category", "Detail"]);
  }
  return sheet;
}

// สร้างชีต Portfolio (ชีตรวม) ถ้ายังไม่มี
function getOrCreatePortfolioSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_PORTFOLIO);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PORTFOLIO);
    sheet.appendRow(PORTFOLIO_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// สร้างชีต Portfolio_groups พร้อมหมวดตั้งต้น ถ้ายังไม่มี
// เช็คแยกเป็น 2 ขั้น (มีชีตไหม / มีข้อมูลไหม) เพราะถ้าชีตถูกสร้างมือไว้ล่วงหน้าแล้วว่างเปล่า
// การใส่ default ไว้ใน if (!sheet) อย่างเดียวจะข้ามการ seed ไป แล้วได้ลิสต์หมวดว่างกลับไป
function getOrCreateGroupsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_PORTFOLIO_GROUPS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PORTFOLIO_GROUPS);
  }

  if (sheet.getLastRow() < 1) {
    sheet.appendRow(["Group", "Label", "TargetPct", "Order"]);
    sheet.setFrozenRows(1);
  }
  if (sheet.getLastRow() < 2) {
    sheet.getRange(2, 1, DEFAULT_GROUPS.length, 4).setValues(DEFAULT_GROUPS);
    SpreadsheetApp.flush(); // ให้ getLastRow() ที่เรียกต่อจากนี้เห็นข้อมูลที่เพิ่งเขียน
  }
  return sheet;
}

// เลือกชีตที่จะทำงานด้วย: ใช้ชีตรวมถ้า migrate แล้ว ถ้ายังไม่ migrate ให้ถอยไปใช้ชีตเก่า
// (กันไม่ให้เว็บพังช่วงระหว่าง deploy เสร็จ แต่ยังไม่ได้สั่ง PORTFOLIO_MIGRATE)
function resolvePortfolioSheet(ss, portfolioType) {
  var unified = ss.getSheetByName(SHEET_PORTFOLIO);
  if (unified && unified.getLastRow() >= 2) return unified;

  var legacyName =
    portfolioType === "growth" ? SHEET_PORTFOLIO_GROWTH : SHEET_PORTFOLIO_MAIN;
  var legacy = ss.getSheetByName(legacyName);
  if (!legacy) throw new Error("Portfolio sheet " + legacyName + " not found");
  return legacy;
}

// คืนรายการชีตพอร์ตที่ "ใช้งานจริง" สำหรับโค้ดที่ต้องไล่อ่านทุกแถว (แจ้งเตือน LINE, doGet)
// migrate แล้ว = ชีตรวมชีตเดียว / ยังไม่ migrate = 2 ชีตเก่า
// ต้องผ่านตรงนี้เสมอ ไม่งั้นหลัง migrate จะไปอ่านชีตเก่าที่หยุดอัปเดตแล้ว
function getActivePortfolioSheets(ss) {
  var unified = ss.getSheetByName(SHEET_PORTFOLIO);
  if (unified && unified.getLastRow() >= 2) {
    return [{ sheet: unified, type: null, migrated: true, numCols: 15 }];
  }

  var out = [];
  [
    { name: SHEET_PORTFOLIO_MAIN, type: "main" },
    { name: SHEET_PORTFOLIO_GROWTH, type: "growth" },
  ].forEach(function (s) {
    var sh = ss.getSheetByName(s.name);
    if (sh) out.push({ sheet: sh, type: s.type, migrated: false, numCols: 13 });
  });
  return out;
}

// ========================================
// 🕒 ฟังก์ชันเช็คเวลาตลาด (Master's Timezone Fix - Updated)
// ========================================
function isMarketOpen() {
  var now = new Date();

  // ใช้ Utilities.formatDate ดึงค่าเวลาของนิวยอร์กออกมาตรงๆ (ชัวร์ 100%)
  // "u" = วันในสัปดาห์ (1=จันทร์, ..., 6=เสาร์, 7=อาทิตย์)
  var nyDay = parseInt(Utilities.formatDate(now, "America/New_York", "u"), 10);
  var nyHour = parseInt(
    Utilities.formatDate(now, "America/New_York", "HH"),
    10,
  );
  var nyMinute = parseInt(
    Utilities.formatDate(now, "America/New_York", "mm"),
    10,
  );

  // 1. เช็ควันหยุด (เสาร์ = 6, อาทิตย์ = 7)
  if (nyDay === 6 || nyDay === 7) {
    Logger.log("😴 วันหยุด Wall Street ตลาดปิด (Weekend)");
    return false;
  }

  // 2. เช็คเวลาตลาดเปิด (09:30 AM ถึง 04:00 PM ตามเวลานิวยอร์ก)
  var isMarketOpen = false;
  if (nyHour > 9 && nyHour < 16) {
    isMarketOpen = true; // ช่วง 10:00 ถึง 15:59
  } else if (nyHour === 9 && nyMinute >= 30) {
    isMarketOpen = true; // ช่วง 09:30 ถึง 09:59
  }

  if (!isMarketOpen) {
    Logger.log(
      "💤 นอกเวลาทำการ Wall Street (" + nyHour + ":" + nyMinute + " NY Time)",
    );
    return false;
  }

  return true;
}

// ========================================
// 🎯 ฟังก์ชันหลัก - สำหรับ Watchlist & Portfolio
// ========================================
function checkAllAndNotify() {
  if (!isMarketOpen()) {
    Logger.log("😴 นอกเวลาทำการ หรือ วันหยุด Wall Street");
    return;
  }
  checkPriceAndNotify();
  checkPortfolioAndNotify();
}

// ========================================
// 🟢 1. ระบบเฝ้าจุดซื้อ (Watchlist)
// ========================================
function checkPriceAndNotify() {
  // 🔥 เพิ่มตัวล็อกตรงนี้! ถ้าตลาดปิด ให้เด้งออกทันที 🔥
  if (!isMarketOpen()) {
    Logger.log("💼 นอกเวลาทำการ - ข้ามการตรวจ Watchlist");
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_WATCHLIST);
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var dataRange = sheet.getRange(2, 1, lastRow - 1, 10); // Updated to 10 columns to include J (note)
  var data = dataRange.getValues();
  var pendingAlerts = [];

  data.forEach(function (row, index) {
    var symbol = row[0];
    var entryPrice = row[1];
    var currentPrice = row[2];
    var status = row[4];
    var cutLossPrice = row[5];
    var targetPrice = row[6];
    var alertType = row[7] || "SMART_ENTRY"; // Column H, default to SMART_ENTRY
    var triggerPrice = row[8] || entryPrice; // Column I, default to entryPrice
    var note = row[9] || ""; // Column J, Note (e.g. "ไม้ 1")

    if (
      currentPrice === "#N/A" ||
      currentPrice === "Loading..." ||
      currentPrice === ""
    )
      return;

    var rowNum = index + 2;
    var diffPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

    // ย่อตัวเลขให้สั้น: 2 ตำแหน่ง ตัด .00 ทิ้ง (1989.44 → 1989.44, 370.00 → 370)
    function fmt(x) {
      var v = Number(x);
      if (isNaN(v)) return "-";
      return (Math.round(v * 100) / 100).toString();
    }
    var noteStr = note ? " (" + note + ")" : "";

    // We only alert if it hasn't been sent yet
    if (status === "SENT_ENTRY") return;

    var isTriggered = false;
    var message = "";
    var newStatus = "SENT_ENTRY"; // สถานะที่จะเขียนกลับเมื่อยิงเตือน (2 จังหวะจะเปลี่ยนเป็น WATCHING)

    // 1. 🎯 SMART ENTRY (รอรับของ) - Buy when price drops to/near Entry Support
    if (alertType === "SMART_ENTRY") {
      var buyBuffer = entryPrice * 1.005; // Buffer 0.5% higher than entry
      if (currentPrice <= buyBuffer && currentPrice > cutLossPrice) {
        isTriggered = true;
        message =
          "🟢 " + symbol + " ลงถึงโซนรับ" + noteStr + "\n" +
          "$" + fmt(currentPrice) + " → รับ " + fmt(entryPrice) +
          " | SL " + fmt(cutLossPrice) + " | TP " + fmt(targetPrice);
      }
    }
    // 2. 🛡️ EMA5 CROSS (ทะลุเส้น 5 วัน) - Buy when price crosses ABOVE EMA5 (Trigger Price)
    else if (alertType === "EMA5_CROSS") {
      if (currentPrice > triggerPrice) {
        isTriggered = true;
        message =
          "🚀 " + symbol + " ยืนเหนือ EMA5" + noteStr + "\n" +
          "$" + fmt(currentPrice) + " > EMA5 " + fmt(triggerPrice) +
          " | SL " + fmt(cutLossPrice) + " | TP " + fmt(targetPrice);
      }
    }
    // 3. 💥 BREAKOUT (ทะลุต้าน) - Alert when price breaks above Resistance (Trigger Price)
    else if (alertType === "BREAKOUT") {
      if (currentPrice >= triggerPrice) {
        isTriggered = true;
        message =
          "💥 " + symbol + " เบรกแนวต้าน" + noteStr + "\n" +
          "$" + fmt(currentPrice) + " > ต้าน " + fmt(triggerPrice) +
          " — เช็ควอลุ่มก่อนเข้า";
      }
    }
    // 4. 🏆 MINERVINI (Buy Stop เหนือ Pivot แต่ "ห้ามไล่เกิน 5%")
    // เข้าซื้อเฉพาะตอนราคาทะลุ Pivot ขึ้นไป และยังอยู่ในโซน 0-5% เหนือ Pivot เท่านั้น
    else if (alertType === "MINERVINI") {
      var chaseLimit = triggerPrice * 1.05; // โซนซื้อ Minervini: Pivot ถึง +5%
      if (currentPrice >= triggerPrice && currentPrice <= chaseLimit) {
        isTriggered = true;
        message =
          "🏆 " + symbol + " ทะลุ Pivot" + noteStr + " [minervini]\n" +
          "$" + fmt(currentPrice) + " | ซื้อ " + fmt(triggerPrice) + "-" + fmt(chaseLimit) +
          " | SL " + fmt(cutLossPrice) + " | TP " + fmt(targetPrice);
      }
    }
    // 5. 🔮 MARTIN LUK — แจ้ง 2 จังหวะ (รอตรงนี้ → ถึงแล้ว)
    // triggerPrice = ราคาที่คาดว่าจะ turn UPTREND
    else if (alertType === "MARTINLUK") {
      var watchLowML = triggerPrice * 0.95; // เข้าโซน = ใกล้ตัดจริง
      var toCrossML = ((triggerPrice - currentPrice) / currentPrice) * 100;

      if (currentPrice >= watchLowML) {
        // จังหวะ 2: ถึงโซนจุดตัดแล้ว → turn UPTREND (ปิดเคส)
        isTriggered = true;
        newStatus = "SENT_ENTRY";
        message =
          "✅ ถึงแล้ว! " + symbol + noteStr + " [martinluk]\n" +
          "$" + fmt(currentPrice) + " แตะจุดตัด " + fmt(triggerPrice) +
          " — turn UPTREND | SL " + fmt(cutLossPrice);
      } else if (status !== "WATCHING") {
        // จังหวะ 1: เพิ่งเพิ่มเข้ามา ยังไม่ถึง → ยืนยัน "กำลังเฝ้าดู รอตรงนี้"
        isTriggered = true;
        newStatus = "WATCHING";
        message =
          "🔭 เฝ้าดู " + symbol + noteStr + " [martinluk]\n" +
          "รอราคาแตะ " + fmt(triggerPrice) + " (ตอนนี้ $" + fmt(currentPrice) +
          " · อีก " + toCrossML.toFixed(1) + "%)";
      }
      // ถ้า status = WATCHING แล้วราคายังไม่ถึง → เงียบไว้ ไม่เตือนซ้ำ
    }

    if (isTriggered) {
      pendingAlerts.push({
        rowNum: rowNum,
        status: newStatus, // ปกติ SENT_ENTRY; MARTINLUK จังหวะ 1 = WATCHING
        text: message,
        diff: diffPercent, // We still sort by diff mostly for SMART_ENTRY order
      });
    }
  });

  if (pendingAlerts.length > 0) {
    pendingAlerts.sort(function (a, b) {
      return a.diff - b.diff;
    });
    var finalMessage = "🔔 อัปเดตสัญญาณ " + pendingAlerts.length + " รายการ\n";
    for (var i = 0; i < pendingAlerts.length; i++) {
      finalMessage += "\n" + (i + 1) + ". " + pendingAlerts[i].text + "\n";
    }

    if (sendLineMessagingAPI(finalMessage)) {
      pendingAlerts.forEach(function (alert) {
        sheet.getRange(alert.rowNum, 5).setValue(alert.status);
      });
    }
  }
}

// ========================================
// 💼 2. ระบบเฝ้าพอร์ต (Portfolio TP & SL)
// ========================================
function checkPortfolioAndNotify() {
  if (!isMarketOpen()) {
    Logger.log("💼 นอกเวลาทำการ - ข้ามการตรวจพอร์ต");
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var pendingAlerts = [];

  getActivePortfolioSheets(ss).forEach(function (target) {
    var sheet = target.sheet;

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    // อ่าน A ถึง M (ก่อน migrate) หรือ A ถึง O (หลัง migrate — มี N=Group เพิ่ม)
    var dataRange = sheet.getRange(2, 1, lastRow - 1, target.numCols);
    var data = dataRange.getValues();

    data.forEach(function (row, index) {
      var symbol = row[1]; // B: Symbol
      var entryPrice = row[4]; // E: Price
      var cutLossPrice = row[5]; // F: CutLoss
      var targetPrice = row[6]; // G: Target
      var status = row[10]; // K: Status (ACTIVE, CLOSED, PARTIAL_SOLD, ALERT_SENT)
      var currentPrice = row[11]; // L: Current Price (จากหน้าแก้ POST)

      // ข้ามหุ้นที่ขายไปแล้วหรือไม่ได้ใส่ราคา
      if (status === "CLOSED" || status === "ALERT_SENT") return;
      if (
        currentPrice === "#N/A" ||
        currentPrice === "Loading..." ||
        currentPrice === "" ||
        currentPrice == null
      )
        return;

      var rowNum = index + 2;
      var profitPct = ((currentPrice - entryPrice) / entryPrice) * 100;
      // หลัง migrate ป้ายกำกับใน LINE จะเป็นชื่อหมวด (N=Group) แทน MAIN/GROWTH เดิม
      var portLabel = target.migrated
        ? String(row[13] || "other").toUpperCase()
        : target.type === "growth"
          ? "GROWTH"
          : "MAIN";

      function fmtP(x) {
        var v = Number(x);
        if (isNaN(v)) return "-";
        return (Math.round(v * 100) / 100).toString();
      }

      // เช็คจุดทำกำไร (Target) — ต้องตั้งเป้าไว้จริง (>0) เท่านั้น
      if (targetPrice > 0 && currentPrice >= targetPrice) {
        pendingAlerts.push({
          rowNum: rowNum,
          sheet: sheet,
          text:
            "🎯 " + symbol + " ถึงเป้า! [" + portLabel + "]\n" +
            "$" + fmtP(currentPrice) + " ≥ เป้า " + fmtP(targetPrice) +
            " (+" + profitPct.toFixed(1) + "%) → ล็อคกำไร",
        });
      }
      // เช็คจุดตัดขาดทุน (Cut Loss) — ต้องตั้งจุดคัทไว้จริง (>0) เท่านั้น
      else if (cutLossPrice > 0 && currentPrice <= cutLossPrice) {
        pendingAlerts.push({
          rowNum: rowNum,
          sheet: sheet,
          text:
            "🚨 " + symbol + " หลุดคัทลอส! [" + portLabel + "]\n" +
            "$" + fmtP(currentPrice) + " ≤ คัท " + fmtP(cutLossPrice) +
            " (" + profitPct.toFixed(1) + "%) → ขายด่วน",
        });
      }
    });
  });

  if (pendingAlerts.length > 0) {
    var finalMessage = "💼 พอร์ตต้องจัดการ " + pendingAlerts.length + " ตัว\n";
    for (var i = 0; i < pendingAlerts.length; i++) {
      finalMessage += "\n" + (i + 1) + ". " + pendingAlerts[i].text + "\n";
    }

    if (sendLineMessagingAPI(finalMessage)) {
      pendingAlerts.forEach(function (alert) {
        alert.sheet.getRange(alert.rowNum, 11).setValue("ALERT_SENT");
      });
    }
  }
}

// ========================================
// 📩📤 ฟังก์ชันยิง LINE
// ========================================
function sendLineMessagingAPI(message) {
  var url = "https://api.line.me/v2/bot/message/broadcast";
  var payload = { messages: [{ type: "text", text: message }] };
  var options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + LINE_ACCESS_TOKEN,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    if (code !== 200) Logger.log("LINE Error: " + response.getContentText());
    return code === 200;
  } catch (e) {
    Logger.log("Exception: " + e.toString());
    return false;
  }
}

// ========================================
// 📥 doPost() - รับข้อมูล (Watchlist & Portfolio)
// ========================================
function doPost(e) {
  try {
    var json = JSON.parse(e.postData.contents);
    const actionType = json.actionType || "WATCHLIST"; // "WATCHLIST" or "PORTFOLIO_BUY" or "PORTFOLIO_SELL"

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // ---------------------------------
    // 1. WATCHLIST (แบบเดิมที่เคยมี)
    // ---------------------------------
    if (actionType === "WATCHLIST") {
      var sheet = ss.getSheetByName(SHEET_WATCHLIST);
      if (!sheet) throw new Error("Watchlist sheet not found");

      var items = json.items;
      var lastRow = sheet.getLastRow();
      
      // เก็บรายการที่มีอยู่แล้วโดยใช้ Ticker + Note (ไม้) เป็น Key 
      // เพื่อให้อัปเดตราคาของ "ไม้เดิม" ได้โดยไม่เพิ่มบรรทัดใหม่
      var existingMap = {}; 
      if (lastRow >= 2) {
        var vals = sheet.getRange(2, 1, lastRow - 1, 10).getValues(); // อ่าน Col A ถึง J
        for (var i = 0; i < vals.length; i++) {
          var ticker = vals[i][0]; // A
          var entry = vals[i][1]; // B
          var note = vals[i][9]; // J
          
          if (ticker) {
            var keyPart = note ? note : entry; // ใช้ Note (เช่น "ไม้ 1") เป็น Key หลัก ถ้าไม่มีให้ใช้ Entry
            existingMap[ticker + "_" + keyPart] = i + 2;
          }
        }
      }

      var newRows = [];
      
      items.forEach(function (item) {
        var keyPart = item.note ? item.note : item.entry;
        var key = item.ticker + "_" + keyPart;
        var rowToUpdate = existingMap[key];
        
        if (rowToUpdate) {
          // ถ้ามีไม้นี้อยู่แล้ว อัปเดตข้อมูลรวมถึงราคาเข้าใหม่ด้วย
          sheet.getRange(rowToUpdate, 2).setValue(item.entry); // อัปเดต Entry เผื่อมีการเปลี่ยนแปลง
          sheet.getRange(rowToUpdate, 5).setValue(""); // reset status
          if (item.cut !== undefined) sheet.getRange(rowToUpdate, 6).setValue(item.cut);
          if (item.target !== undefined) sheet.getRange(rowToUpdate, 7).setValue(item.target);
          if (item.alertType) sheet.getRange(rowToUpdate, 8).setValue(item.alertType);
          sheet.getRange(rowToUpdate, 9).setValue(item.triggerPrice !== undefined ? item.triggerPrice : item.entry); // อัปเดต Trigger Price ใหม่
          if (item.note !== undefined) sheet.getRange(rowToUpdate, 10).setValue(item.note);
        } else {
          // ถ้ายังไม่มีไม้นี้ ให้เตรียม Append รวดเดียว
          var nextRow = lastRow + newRows.length + 1;
          var formulaC = "=GOOGLEFINANCE(A" + nextRow + ")";
          var formulaD = "=(C" + nextRow + "-B" + nextRow + ")/B" + nextRow;
          
          newRows.push([
            item.ticker,
            item.entry,
            formulaC,
            formulaD,
            "", // Status
            item.cut || "",
            item.target || "",
            item.alertType || "",
            item.triggerPrice !== undefined ? item.triggerPrice : "",
            item.note || "" // Note / Tranche
          ]);
          
          existingMap[key] = nextRow; // เผื่อข้อมูลที่ส่งมาซ้ำกันเองในรอบเดียว
        }
      });

      // ใช้ setValues บันทึกข้อมูลใหม่รวดเดียว (Batch Insert) ทำให้สคริปต์ทำงานเร็วขึ้น 10 เท่า
      if (newRows.length > 0) {
        sheet.getRange(lastRow + 1, 1, newRows.length, 10).setValues(newRows);
      }

      return ContentService.createTextOutput(
        JSON.stringify({ success: true, count: items.length, appended: newRows.length }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------------
    // 2. PORTFOLIO - บันทึกการซื้อ (BUY)
    // ---------------------------------
    if (actionType === "PORTFOLIO_BUY") {
      var item = json.item; // { date, ticker, quantity, price, cut, target, group }

      var sheet = resolvePortfolioSheet(ss, item.portfolioType);
      var newRow = sheet.getLastRow() + 1;

      // หัวตารางอ้างอิง: A=Date, B=Symbol, C=Action, D=Quantity, E=Price, F=CutLoss, G=Target, H=SoldDate, I=SoldQty, J=SoldPrice, K=Status, L=CurrentPriceFormula, M=TargetAlloc, N=Group
      sheet.getRange(newRow, 1).setValue(item.date); // A: Date
      sheet.getRange(newRow, 2).setValue(item.ticker); // B: Symbol
      sheet.getRange(newRow, 3).setValue("BUY"); // C: Action
      sheet.getRange(newRow, 4).setValue(item.quantity); // D: Qty
      sheet.getRange(newRow, 5).setValue(item.price); // E: Price
      sheet.getRange(newRow, 6).setValue(item.cut); // F: CutLoss
      sheet.getRange(newRow, 7).setValue(item.target); // G: Target
      sheet.getRange(newRow, 11).setValue("ACTIVE"); // K: Status
      sheet.getRange(newRow, 13).setValue(item.targetAlloc || 0); // M: TargetAlloc
      sheet.getRange(newRow, 14).setValue(item.group || "other"); // N: Group

      // L: Current Price Formula แบบเดียวกับหน้า Watchlist
      if (item.ticker.toUpperCase() === "CASH") {
        sheet.getRange(newRow, 12).setValue(1);
      } else {
        sheet
          .getRange(newRow, 12)
          .setFormula("=GOOGLEFINANCE(B" + newRow + ")");
      }

      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          message: "บันทึกซื้อหุ้น " + item.ticker + " แล้ว!",
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------------
    // 3. PORTFOLIO - บันทึกการขาย (SELL)
    // ---------------------------------
    if (actionType === "PORTFOLIO_SELL") {
      var item = json.item; // { rowIndex, soldDate, soldQty, soldPrice }

      var sheet = resolvePortfolioSheet(ss, item.portfolioType);

      // อัปเดตข้อมูลการขายในแถวที่ระบุ (rowIndex ที่ได้จากการดึง GET)
      var targetRow = item.rowIndex; // ต้องตรงตาม index + 2

      sheet.getRange(targetRow, 8).setValue(item.soldDate); // H: SoldDate
      sheet.getRange(targetRow, 9).setValue(item.soldQty); // I: SoldQty
      sheet.getRange(targetRow, 10).setValue(item.soldPrice); // J: SoldPrice

      // ดึง Qty ซื้อมาเพื่อเทียบว่าขายหมดหรือยัง ให้ระบบ Auto-Status
      var buyQty = sheet.getRange(targetRow, 4).getValue();
      if (item.soldQty >= buyQty) {
        sheet.getRange(targetRow, 11).setValue("CLOSED"); // K: Status -> ปิดโพสิชัน
        sheet.getRange(targetRow, 13).setValue(0); // M: TargetAlloc -> เคลียร์สัดส่วนเป้าหมายเป็น 0 เมื่อปิดโพสิชันหมดแล้ว
      } else {
        sheet.getRange(targetRow, 11).setValue("PARTIAL_SOLD"); // ขายไปบางส่วน
      }

      return ContentService.createTextOutput(
        JSON.stringify({ success: true, message: "บันทึกข้อมูลการขายสำเร็จ!" }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------------
    // 4. PORTFOLIO - ดึงข้อมูลทั้งหมด (GET workaround)
    // ---------------------------------
    if (actionType === "PORTFOLIO_GET") {
      var data = [];
      var targets = getActivePortfolioSheets(ss);
      var migrated = targets.length > 0 && targets[0].migrated;

      targets.forEach(function (t) {
        var sheet = t.sheet;
        var lastRow = sheet.getLastRow();
        if (lastRow < 2) return;

        var values = sheet.getRange(2, 1, lastRow - 1, t.numCols).getValues();

        values.forEach(function (row, index) {
          var symbol = row[1];
          if (symbol && symbol !== "") {
            data.push({
              rowIndex: index + 2,
              date: row[0],
              ticker: symbol,
              action: row[2],
              quantity: row[3],
              price: row[4],
              cutLoss: row[5],
              target: row[6],
              soldDate: row[7],
              soldQty: row[8],
              soldPrice: row[9],
              status: row[10],
              targetAlloc: row[12] || 0,
              group: t.migrated ? row[13] || "other" : "other",
              // portfolioType เลิกใช้แล้ว คงไว้ให้หน้าเว็บเดิมยังทำงานได้ระหว่างเปลี่ยนผ่าน
              portfolioType: t.migrated ? row[14] || "main" : t.type,
            });
          }
        });
      });

      return ContentService.createTextOutput(
        JSON.stringify({ status: "success", data: data, migrated: !!migrated }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------------
    // 5. PORTFOLIO - แก้ไขข้อมูลในแถวที่มีอยู่ (EDIT)
    // ---------------------------------
    if (actionType === "PORTFOLIO_EDIT") {
      // { rowIndex, expectTicker, + field ที่ต้องการแก้ }
      var item = json.item;

      var sheet = resolvePortfolioSheet(ss, item.portfolioType);

      var targetRow = item.rowIndex;
      if (!targetRow || targetRow < 2) throw new Error("rowIndex ไม่ถูกต้อง: " + targetRow);

      // rowIndex เลื่อนได้ถ้ามีการลบแถว จึงบังคับให้ส่ง expectTicker มายืนยันว่าเป็นแถวที่ตั้งใจแก้จริง
      var currentTicker = sheet.getRange(targetRow, 2).getValue();
      if (
        !item.expectTicker ||
        String(currentTicker).toUpperCase() !== String(item.expectTicker).toUpperCase()
      ) {
        throw new Error(
          "Ticker ไม่ตรง! แถว " + targetRow + " คือ '" + currentTicker +
            "' แต่ส่ง expectTicker='" + item.expectTicker + "' มา — ยกเลิกการแก้ไข",
        );
      }

      var colMap = {
        date: 1, ticker: 2, action: 3, quantity: 4, price: 5,
        cut: 6, target: 7, soldDate: 8, soldQty: 9, soldPrice: 10,
        status: 11, targetAlloc: 13, group: 14,
      };

      // แก้เฉพาะ field ที่ส่งมา field ที่ไม่ส่ง (undefined) จะไม่ถูกแตะ
      var changed = [];
      Object.keys(colMap).forEach(function (key) {
        if (item[key] !== undefined) {
          sheet.getRange(targetRow, colMap[key]).setValue(item[key]);
          changed.push(key);
        }
      });

      if (changed.length === 0) throw new Error("ไม่มี field ให้แก้ไขในแถว " + targetRow);

      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          message: "แก้ไขแถว " + targetRow + " (" + currentTicker + "): " + changed.join(", "),
          changed: changed,
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------------
    // 6. PORTFOLIO - ลบแถวทิ้ง (DELETE)
    // ---------------------------------
    if (actionType === "PORTFOLIO_DELETE") {
      var item = json.item; // { rowIndex, expectTicker }

      var sheet = resolvePortfolioSheet(ss, item.portfolioType);

      var targetRow = item.rowIndex;
      if (!targetRow || targetRow < 2) throw new Error("rowIndex ไม่ถูกต้อง: " + targetRow);

      var currentTicker = sheet.getRange(targetRow, 2).getValue();
      if (
        !item.expectTicker ||
        String(currentTicker).toUpperCase() !== String(item.expectTicker).toUpperCase()
      ) {
        throw new Error(
          "Ticker ไม่ตรง! แถว " + targetRow + " คือ '" + currentTicker +
            "' แต่ส่ง expectTicker='" + item.expectTicker + "' มา — ยกเลิกการลบ",
        );
      }

      sheet.deleteRow(targetRow);

      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          message: "ลบแถว " + targetRow + " (" + currentTicker + ") แล้ว",
          note: "แถวที่อยู่ใต้แถว " + targetRow + " จะเลื่อน rowIndex ขึ้น 1 ให้ดึง PORTFOLIO_GET ใหม่ก่อนสั่งงานต่อ",
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------------
    // 7. GROUPS - ดึงหมวดพอร์ต + สัดส่วนเป้าหมาย
    // ---------------------------------
    if (actionType === "GROUPS_GET") {
      var gSheet = getOrCreateGroupsSheet();
      var groups = [];
      var gLast = gSheet.getLastRow();
      if (gLast >= 2) {
        gSheet.getRange(2, 1, gLast - 1, 4).getValues().forEach(function (row) {
          if (row[0] && row[0] !== "") {
            groups.push({
              group: row[0],
              label: row[1] || row[0],
              targetPct: Number(row[2]) || 0,
              order: Number(row[3]) || 999,
            });
          }
        });
      }
      groups.sort(function (a, b) { return a.order - b.order; });

      return ContentService.createTextOutput(
        JSON.stringify({ status: "success", data: groups }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------------
    // 8. GROUPS - เขียนทับรายการหมวดทั้งชุด (เพิ่ม/ลบ/แก้ % ได้จากที่นี่)
    // ---------------------------------
    if (actionType === "GROUPS_SET") {
      var groups = json.groups; // [{ group, label, targetPct, order }]
      if (!groups || !groups.length) throw new Error("ต้องส่ง groups มาอย่างน้อย 1 หมวด");

      var gSheet = getOrCreateGroupsSheet();

      // กันตั้งสัดส่วนรวมเกิน 100% โดยไม่ตั้งใจ
      var totalPct = 0;
      groups.forEach(function (g) { totalPct += Number(g.targetPct) || 0; });
      if (totalPct > 100.01) {
        throw new Error("สัดส่วนเป้าหมายรวมกันได้ " + totalPct + "% ซึ่งเกิน 100% — ยกเลิก");
      }

      var rows = groups.map(function (g, i) {
        if (!g.group) throw new Error("มีหมวดที่ไม่ได้ใส่ชื่อ key (field 'group')");
        return [g.group, g.label || g.group, Number(g.targetPct) || 0, Number(g.order) || i + 1];
      });

      // ล้างของเดิมแล้วเขียนใหม่ทั้งชุด
      if (gSheet.getLastRow() >= 2) {
        gSheet.getRange(2, 1, gSheet.getLastRow() - 1, 4).clearContent();
      }
      gSheet.getRange(2, 1, rows.length, 4).setValues(rows);

      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          message: "บันทึก " + rows.length + " หมวดแล้ว (รวม " + totalPct + "%)",
          totalPct: totalPct,
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------------
    // 9. PORTFOLIO - ย้ายข้อมูลจาก 2 ชีตเก่ามารวมเป็นชีตเดียว (ทำครั้งเดียว)
    // ---------------------------------
    if (actionType === "PORTFOLIO_MIGRATE") {
      var groupMap = json.groupMap || {}; // { "RKLB": "space", ... }
      var dryRun = json.dryRun === true;

      var pSheet = getOrCreatePortfolioSheet();
      getOrCreateGroupsSheet(); // สร้าง config ไปพร้อมกันเลย

      // กันเผลอสั่งซ้ำแล้วข้อมูลกลายเป็น 2 เท่า
      if (pSheet.getLastRow() >= 2 && !json.force) {
        throw new Error(
          "ชีต " + SHEET_PORTFOLIO + " มีข้อมูลอยู่แล้ว " + (pSheet.getLastRow() - 1) +
            " แถว — ถ้าตั้งใจจะเขียนซ้ำให้ส่ง force:true (ข้อมูลเดิมจะไม่ถูกลบ)",
        );
      }

      var rows = [];
      var unmapped = {};
      [
        { name: SHEET_PORTFOLIO_MAIN, type: "main" },
        { name: SHEET_PORTFOLIO_GROWTH, type: "growth" },
      ].forEach(function (src) {
        var sheet = ss.getSheetByName(src.name);
        if (!sheet || sheet.getLastRow() < 2) return;

        sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues().forEach(function (row) {
          var symbol = row[1];
          if (!symbol || symbol === "") return;

          var key = String(symbol).toUpperCase();
          var group = groupMap[key];
          if (!group) {
            group = "other";
            unmapped[key] = true;
          }

          // คอลัมน์ L เป็นสูตร GOOGLEFINANCE จึงไม่ก็อปค่ามา ปล่อยว่างแล้วไปใส่สูตรใหม่ทีหลัง
          rows.push([
            row[0], row[1], row[2], row[3], row[4], row[5], row[6],
            row[7], row[8], row[9], row[10], "", row[12] || 0,
            group, src.type,
          ]);
        });
      });

      if (dryRun) {
        return ContentService.createTextOutput(
          JSON.stringify({
            success: true,
            dryRun: true,
            wouldWrite: rows.length,
            unmapped: Object.keys(unmapped),
            message: "dryRun: ยังไม่ได้เขียนอะไรลงชีต",
          }),
        ).setMimeType(ContentService.MimeType.JSON);
      }

      if (!rows.length) throw new Error("ไม่พบข้อมูลในชีตเก่าเลย");

      var startRow = pSheet.getLastRow() + 1;
      pSheet.getRange(startRow, 1, rows.length, 15).setValues(rows);

      // ใส่สูตรราคาปัจจุบันในคอลัมน์ L ทีละแถว (CASH ใช้ค่า 1 ตายตัว)
      for (var i = 0; i < rows.length; i++) {
        var r = startRow + i;
        if (String(rows[i][1]).toUpperCase() === "CASH") {
          pSheet.getRange(r, 12).setValue(1);
        } else {
          pSheet.getRange(r, 12).setFormula("=GOOGLEFINANCE(B" + r + ")");
        }
      }

      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          migrated: rows.length,
          unmapped: Object.keys(unmapped),
          message:
            "ย้าย " + rows.length + " แถวเข้าชีต " + SHEET_PORTFOLIO +
            " แล้ว (ชีตเก่ายังอยู่ครบ ไม่ได้ลบ)",
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------------
    // 10. SNIPER LOG - บันทึกสัญญาณสไนเปอร์
    // ---------------------------------
    if (actionType === "SNIPER_LOG_SAVE") {
      var logSheet = ss.getSheetByName("sniper_log");
      if (!logSheet) {
        logSheet = ss.insertSheet("sniper_log");
        logSheet.appendRow([
          "date",
          "symbol",
          "playbook",
          "price",
          "bbWidth",
          "rsi",
          "volumeRatio",
          "signals",
          "result",
        ]);
      }
      var entries = json.entries;
      entries.forEach(function (entry) {
        logSheet.appendRow([
          entry.date,
          entry.symbol,
          entry.playbook,
          entry.price,
          entry.bbWidth,
          entry.rsi,
          entry.volumeRatio,
          entry.signals,
          entry.result || "PENDING",
        ]);
      });
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, saved: entries.length }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------------
    // 6. SNIPER LOG - อัปเดตผล (WIN/LOSS)
    // ---------------------------------
    if (actionType === "SNIPER_LOG_UPDATE") {
      var logSheet = ss.getSheetByName("sniper_log");
      if (!logSheet) throw new Error("sniper_log sheet not found");
      logSheet.getRange(json.rowIndex, 9).setValue(json.result);
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, updated: json.result }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------------
    // 7. STOCK MASTER - ดึงรายการหุ้นทั้งหมด
    // ---------------------------------
    if (actionType === "STOCKS_GET") {
      var sSheet = getOrCreateStocksSheet();
      var stockData = [];
      var sLastRow = sSheet.getLastRow();
      if (sLastRow >= 2) {
        var sVals = sSheet.getRange(2, 1, sLastRow - 1, 3).getValues();
        sVals.forEach(function (r) {
          if (r[0]) {
            stockData.push({
              symbol: String(r[0]).toUpperCase().trim(),
              category: r[1] || "",
              detail: r[2] || "",
            });
          }
        });
      }
      return ContentService.createTextOutput(
        JSON.stringify({ status: "success", source: "sheet", data: stockData }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------------
    // 8. STOCK MASTER - เพิ่ม/แก้ไข (upsert by symbol) รองรับทั้งเดี่ยวและกลุ่ม
    // ---------------------------------
    if (actionType === "STOCKS_UPSERT") {
      var uSheet = getOrCreateStocksSheet();
      var uItems = json.items || (json.item ? [json.item] : []);
      var uLastRow = uSheet.getLastRow();
      var uMap = {};
      if (uLastRow >= 2) {
        var uKeys = uSheet.getRange(2, 1, uLastRow - 1, 1).getValues();
        for (var ui = 0; ui < uKeys.length; ui++) {
          if (uKeys[ui][0])
            uMap[String(uKeys[ui][0]).toUpperCase().trim()] = ui + 2;
        }
      }
      var newStockRows = [];
      uItems.forEach(function (it) {
        if (!it.symbol) return;
        var sym = String(it.symbol).toUpperCase().trim();
        var row = uMap[sym];
        if (row) {
          uSheet.getRange(row, 2).setValue(it.category || "");
          uSheet.getRange(row, 3).setValue(it.detail || "");
        } else {
          newStockRows.push([sym, it.category || "", it.detail || ""]);
          uMap[sym] = uLastRow + newStockRows.length;
        }
      });
      if (newStockRows.length > 0) {
        uSheet
          .getRange(uLastRow + 1, 1, newStockRows.length, 3)
          .setValues(newStockRows);
      }
      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          appended: newStockRows.length,
          count: uItems.length,
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------------
    // 9. STOCK MASTER - ลบ (by symbol)
    // ---------------------------------
    if (actionType === "STOCKS_DELETE") {
      var dSheet = getOrCreateStocksSheet();
      var dSym = String(json.symbol || "").toUpperCase().trim();
      var dLastRow = dSheet.getLastRow();
      var deleted = 0;
      if (dSym && dLastRow >= 2) {
        var dVals = dSheet.getRange(2, 1, dLastRow - 1, 1).getValues();
        // ลบจากล่างขึ้นบนกัน index เพี้ยน
        for (var di = dVals.length - 1; di >= 0; di--) {
          if (String(dVals[di][0]).toUpperCase().trim() === dSym) {
            dSheet.deleteRow(di + 2);
            deleted++;
          }
        }
      }
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, deleted: deleted }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error("Invalid actionType");
  } catch (err) {
    Logger.log("doPost Error: " + err.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ error: err.toString() }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// 📥 doGet() - ส่งคืนข้อมูลพอร์ตทั้งหมดไปที่ระบบ Dashboard
// ========================================
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    // ── Sniper Log (ถ้าร้องขอ sheet=sniper_log) ──
    if (e.parameter.sheet === "sniper_log") {
      var logSheet = ss.getSheetByName("sniper_log");
      if (!logSheet) {
        return ContentService.createTextOutput(
          JSON.stringify({ success: true, data: [] }),
        ).setMimeType(ContentService.MimeType.JSON);
      }
      var logData = [];
      var logLastRow = logSheet.getLastRow();
      if (logLastRow >= 2) {
        var logRows = logSheet.getRange(2, 1, logLastRow - 1, 9).getValues();
        logRows.forEach(function (row, index) {
          if (row[1]) {
            logData.push({
              rowIndex: index + 2,
              date: row[0],
              symbol: row[1],
              playbook: row[2],
              price: row[3],
              bbWidth: row[4],
              rsi: row[5],
              volumeRatio: row[6],
              signals: row[7],
              result: row[8],
            });
          }
        });
      }
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, data: logData.reverse() }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var data = [];

    getActivePortfolioSheets(ss).forEach(function (sData) {
      var sheet = sData.sheet;

      var lastRow = sheet.getLastRow();

      if (lastRow >= 2) {
        var range = sheet.getRange(2, 1, lastRow - 1, sData.numCols);
        var values = range.getValues();

        values.forEach(function (row, index) {
          var symbol = row[1]; // B: Symbol
          if (symbol && symbol !== "") {
            data.push({
              rowIndex: index + 2, // สำคัญ! ใช้สำหรับระบุแถวตอนจะอัปเดตขาย (SELL)
              date: row[0],
              ticker: symbol,
              action: row[2],
              quantity: row[3],
              price: row[4],
              cutLoss: row[5],
              target: row[6],
              soldDate: row[7],
              soldQty: row[8],
              soldPrice: row[9],
              status: row[10],
              group: sData.migrated ? row[13] || "other" : "other",
              portfolioType: sData.migrated ? row[14] || "main" : sData.type,
            });
          }
        });
      }
    });

    var output = ContentService.createTextOutput(
      JSON.stringify({ status: "success", data: data }),
    );
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: err.toString() }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

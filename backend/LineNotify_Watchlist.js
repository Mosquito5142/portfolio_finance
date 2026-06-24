// ========================================
// ⚙️ CONFIGURATION
// ========================================
var LINE_ACCESS_TOKEN = ""; // ใส่ Token ของคุณ
var SHEET_WATCHLIST = "LineNotify_Watchlist";
var SHEET_PORTFOLIO_MAIN = "Portfolio_main";
var SHEET_PORTFOLIO_GROWTH = "Portfolio_growth";

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

    // We only alert if it hasn't been sent yet
    if (status === "SENT_ENTRY") return;

    var isTriggered = false;
    var message = "";

    // 1. 🎯 SMART ENTRY (รอรับของ) - Buy when price drops to/near Entry Support
    if (alertType === "SMART_ENTRY") {
      var buyBuffer = entryPrice * 1.005; // Buffer 0.5% higher than entry
      if (currentPrice <= buyBuffer && currentPrice > cutLossPrice) {
        var trancheStr = note ? " [" + note + "]" : "";
        isTriggered = true;
        message =
          "🟢 SMART ENTRY: " +
          symbol +
          trancheStr +
          "\n" +
          "💰 ราคาลงมาที่โซนซื้อ: $" +
          currentPrice +
          " (เป้ารับ: $" +
          entryPrice +
          ")\n" +
          "🛑 คัทลอส: $" +
          cutLossPrice +
          " | 🎯 ทำกำไร: $" +
          targetPrice;
      }
    }
    // 2. 🛡️ EMA5 CROSS (ทะลุเส้น 5 วัน) - Buy when price crosses ABOVE EMA5 (Trigger Price)
    else if (alertType === "EMA5_CROSS") {
      if (currentPrice > triggerPrice) {
        isTriggered = true;
        message =
          "🚀 MOMENTUM BITE: " +
          symbol +
          "\n" +
          "📈 ราคาทะลุยืนเหนือ EMA5 ได้แล้วที่ $" +
          currentPrice +
          "\n" +
          "🔥 EMA5 Level: $" +
          triggerPrice +
          "\n" +
          "🛑 คัทลอส: $" +
          cutLossPrice +
          " | 🎯 แนวต้านถัดไป: $" +
          targetPrice;
      }
    }
    // 3. 💥 BREAKOUT (ทะลุต้าน) - Alert when price breaks above Resistance (Trigger Price)
    else if (alertType === "BREAKOUT") {
      if (currentPrice >= triggerPrice) {
        isTriggered = true;
        message =
          "💥 BREAKOUT ALERT: " +
          symbol +
          "\n" +
          "🔥 ดันทะลุแนวต้านสำคัญ! ราคา: $" +
          currentPrice +
          "\n" +
          "🚧 แนวต้านที่ทะลุ (Trigger): $" +
          triggerPrice +
          "\n" +
          "🚨 โวลุ่มเข้า? จับตาดูให้ดี!";
      }
    }
    // 4. 🏆 MINERVINI (Buy Stop เหนือ Pivot แต่ "ห้ามไล่เกิน 5%")
    // เข้าซื้อเฉพาะตอนราคาทะลุ Pivot ขึ้นไป และยังอยู่ในโซน 0-5% เหนือ Pivot เท่านั้น
    else if (alertType === "MINERVINI") {
      var chaseLimit = triggerPrice * 1.05; // โซนซื้อ Minervini: Pivot ถึง +5%
      if (currentPrice >= triggerPrice && currentPrice <= chaseLimit) {
        var mTranche = note ? " [" + note + "]" : "";
        isTriggered = true;
        message =
          "🏆 MINERVINI BUY: " +
          symbol +
          mTranche +
          "\n" +
          "🚀 ทะลุ Pivot เข้าโซนซื้อแล้ว! ราคา: $" +
          currentPrice +
          "\n" +
          "🎯 Pivot (Buy Stop): $" +
          triggerPrice +
          " | ไล่ได้ไม่เกิน: $" +
          chaseLimit.toFixed(2) +
          "\n" +
          "🛑 คัทลอส: $" +
          cutLossPrice +
          " | 🎯 เป้า: $" +
          targetPrice;
      }
    }

    if (isTriggered) {
      pendingAlerts.push({
        rowNum: rowNum,
        status: "SENT_ENTRY",
        text: message,
        diff: diffPercent, // We still sort by diff mostly for SMART_ENTRY order
      });
    }
  });

  if (pendingAlerts.length > 0) {
    pendingAlerts.sort(function (a, b) {
      return a.diff - b.diff;
    });
    var finalMessage =
      "🎯 SNIPER ALERT! ทะลวงโซนรับ 🎯\n====================\n\n";
    for (var i = 0; i < pendingAlerts.length; i++) {
      finalMessage += i + 1 + ". " + pendingAlerts[i].text + "\n\n";
    }
    finalMessage += "====================\n⚡";

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
  var sheetsToCheck = [SHEET_PORTFOLIO_MAIN, SHEET_PORTFOLIO_GROWTH];
  var pendingAlerts = [];

  sheetsToCheck.forEach(function (sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    // อ่านข้อมูล A ถึง M (รวม L=Current Price Formula ที่เพิ่งเพิ่ม)
    var dataRange = sheet.getRange(2, 1, lastRow - 1, 13);
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
      var portLabel =
        sheetName === SHEET_PORTFOLIO_MAIN ? "[MAIN]" : "[GROWTH]";

      // เช็คจุดทำกำไร (Target)
      if (currentPrice >= targetPrice) {
        var msgTarget =
          "🎯 " +
          portLabel +
          " TARGET HIT!: " +
          symbol +
          "\n💰 ราคาปัจจุบัน: $" +
          currentPrice +
          " (เป้า: $" +
          targetPrice +
          ")\n🚀 กำไรทะลุเป้า: +" +
          profitPct.toFixed(2) +
          "%\n💡 อย่าลืมเข้าไประบบเพื่อล็อคกำไร/ปิดสถานะ!";

        pendingAlerts.push({
          rowNum: rowNum,
          sheet: sheet,
          text: msgTarget,
        });
      }
      // เช็คจุดตัดขาดทุน (Cut Loss)
      else if (currentPrice <= cutLossPrice) {
        var msgCut =
          "🚨 " +
          portLabel +
          " CUT LOSS REACHED!: " +
          symbol +
          "\n🔻 ราคาปัจจุบัน: $" +
          currentPrice +
          " (จุดคัท: $" +
          cutLossPrice +
          ")\n🩸 ขาดทุน: " +
          profitPct.toFixed(2) +
          "%\n🛑 ถึงจุดต้องมอบตัว! ไปตั้งขายด่วน!!";

        pendingAlerts.push({
          rowNum: rowNum,
          sheet: sheet,
          text: msgCut,
        });
      }
    });
  });

  if (pendingAlerts.length > 0) {
    var finalMessage =
      "💼 PORTFOLIO ACTION REQUIRED 💼\n====================\n\n";
    for (var i = 0; i < pendingAlerts.length; i++) {
      finalMessage += i + 1 + ". " + pendingAlerts[i].text + "\n\n";
    }
    finalMessage += "====================\n⚠️";

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
      var item = json.item; // { date, ticker, quantity, price, cut, target, portfolioType }

      var targetSheetName =
        item.portfolioType === "growth"
          ? SHEET_PORTFOLIO_GROWTH
          : SHEET_PORTFOLIO_MAIN;
      var sheet = ss.getSheetByName(targetSheetName);
      if (!sheet)
        throw new Error("Portfolio sheet + " + targetSheetName + " not found");
      var newRow = sheet.getLastRow() + 1;

      // หัวตารางอ้างอิง: A=Date, B=Symbol, C=Action, D=Quantity, E=Price, F=CutLoss, G=Target, H=SoldDate, I=SoldQty, J=SoldPrice, K=Status, L=CurrentPriceFormula, M=TargetAlloc
      sheet.getRange(newRow, 1).setValue(item.date); // A: Date
      sheet.getRange(newRow, 2).setValue(item.ticker); // B: Symbol
      sheet.getRange(newRow, 3).setValue("BUY"); // C: Action
      sheet.getRange(newRow, 4).setValue(item.quantity); // D: Qty
      sheet.getRange(newRow, 5).setValue(item.price); // E: Price
      sheet.getRange(newRow, 6).setValue(item.cut); // F: CutLoss
      sheet.getRange(newRow, 7).setValue(item.target); // G: Target
      sheet.getRange(newRow, 11).setValue("ACTIVE"); // K: Status
      sheet.getRange(newRow, 13).setValue(item.targetAlloc || 0); // M: TargetAlloc

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
      var item = json.item; // { rowIndex, soldDate, soldQty, soldPrice, portfolioType }

      var targetSheetName =
        item.portfolioType === "growth"
          ? SHEET_PORTFOLIO_GROWTH
          : SHEET_PORTFOLIO_MAIN;
      var sheet = ss.getSheetByName(targetSheetName);
      if (!sheet)
        throw new Error("Portfolio sheet " + targetSheetName + " not found");

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
      var sheetsToCheck = [
        { name: SHEET_PORTFOLIO_MAIN, type: "main" },
        { name: SHEET_PORTFOLIO_GROWTH, type: "growth" },
      ];

      sheetsToCheck.forEach(function (sData) {
        var sheet = ss.getSheetByName(sData.name);
        if (!sheet) return; // Skip if sheet doesn't exist yet

        var lastRow = sheet.getLastRow();
        if (lastRow >= 2) {
          var range = sheet.getRange(2, 1, lastRow - 1, 13);
          var values = range.getValues();

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
                portfolioType: sData.type,
              });
            }
          });
        }
      });

      return ContentService.createTextOutput(
        JSON.stringify({ status: "success", data: data }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------------
    // 5. SNIPER LOG - บันทึกสัญญาณสไนเปอร์
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
    var sheetsToCheck = [
      { name: SHEET_PORTFOLIO_MAIN, type: "main" },
      { name: SHEET_PORTFOLIO_GROWTH, type: "growth" },
    ];

    sheetsToCheck.forEach(function (sData) {
      var sheet = ss.getSheetByName(sData.name);
      if (!sheet) return;

      var lastRow = sheet.getLastRow();

      if (lastRow >= 2) {
        var range = sheet.getRange(2, 1, lastRow - 1, 11);
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
              portfolioType: sData.type,
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

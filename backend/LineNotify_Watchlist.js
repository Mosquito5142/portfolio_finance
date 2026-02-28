// ========================================
// ⚙️ CONFIGURATION
// ========================================
var LINE_ACCESS_TOKEN = ""; // ใส่ Token ของคุณ
var SHEET_WATCHLIST = "LineNotify_Watchlist";
var SHEET_PORTFOLIO_MAIN = "Portfolio_main";
var SHEET_PORTFOLIO_GROWTH = "Portfolio_growth";

// ========================================
// 🕒 ฟังก์ชันเช็คเวลาตลาด (Master's Timezone Fix)
// ========================================
function isMarketOpen() {
  // 🔥 THE MASTER'S TIMEZONE FIX 🔥
  // สั่งให้บอทแปลงเวลาปัจจุบันเป็นโซนเวลาของ "นิวยอร์ก" (แก้ปัญหาเวลาคร่อมวันและ Daylight Saving ถาวร)
  var now = new Date();
  var nyTimeString = now.toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
  var nyTime = new Date(nyTimeString);

  var nyDay = nyTime.getDay(); // 0 = อาทิตย์, 1 = จันทร์, ..., 6 = เสาร์
  var nyHour = nyTime.getHours();
  var nyMinute = nyTime.getMinutes();

  // 1. เช็ควันหยุด (อิงตามปฏิทินอเมริกา)
  if (nyDay === 0 || nyDay === 6) {
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_WATCHLIST);
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var dataRange = sheet.getRange(2, 1, lastRow - 1, 7);
  var data = dataRange.getValues();
  var pendingAlerts = [];

  data.forEach(function (row, index) {
    var symbol = row[0];
    var entryPrice = row[1];
    var currentPrice = row[2];
    var status = row[4];
    var cutLossPrice = row[5];
    var targetPrice = row[6];

    if (
      currentPrice === "#N/A" ||
      currentPrice === "Loading..." ||
      currentPrice === ""
    )
      return;

    var rowNum = index + 2;
    var buyBuffer = entryPrice * 1.005; // Buffer 0.5%
    var diffPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

    if (
      currentPrice <= buyBuffer &&
      currentPrice > cutLossPrice &&
      status !== "SENT_ENTRY"
    ) {
      var message =
        "🟢 BUY: " +
        symbol +
        "\n💰 ราคาลงมาที่: $" +
        currentPrice +
        " (เป้ารับ: $" +
        entryPrice +
        ")\n🛑 คัทลอส: $" +
        cutLossPrice +
        " | 🎯 ทำกำไร: $" +
        targetPrice +
        "\n⏱️ (Diff: " +
        diffPercent.toFixed(2) +
        "%)";

      pendingAlerts.push({
        rowNum: rowNum,
        status: "SENT_ENTRY",
        text: message,
        diff: diffPercent,
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
      var existingTickers = {};

      if (lastRow >= 2) {
        var vals = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < vals.length; i++) {
          existingTickers[vals[i][0]] = i + 2;
        }
      }

      items.forEach(function (item) {
        var rowToUpdate = existingTickers[item.ticker];
        if (rowToUpdate) {
          sheet.getRange(rowToUpdate, 5).setValue(""); // reset status
        } else {
          rowToUpdate = sheet.getLastRow() + 1;
          sheet.getRange(rowToUpdate, 1).setValue(item.ticker);
          sheet
            .getRange(rowToUpdate, 3)
            .setFormula("=GOOGLEFINANCE(A" + rowToUpdate + ")");
          sheet
            .getRange(rowToUpdate, 4)
            .setFormula(
              "=(C" + rowToUpdate + "-B" + rowToUpdate + ")/B" + rowToUpdate,
            );
        }
        sheet.getRange(rowToUpdate, 2).setValue(item.entry);
        sheet.getRange(rowToUpdate, 6).setValue(item.cut);
        sheet.getRange(rowToUpdate, 7).setValue(item.target);
      });

      return ContentService.createTextOutput(
        JSON.stringify({ success: true, count: items.length }),
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

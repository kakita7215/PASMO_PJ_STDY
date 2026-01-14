// app.js - ESP32 Alarm Client-side JavaScript
// WebSocket接続（本番環境のURLに変更）
const wsUrl = window.location.protocol === 'https:' 
  ? `wss://${window.location.host}`
  : `ws://${window.location.host}`;

let ws;
let reconnectTimer;

function connect() {
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log("[WS] Connected");
    updateConnectionStatus(true);
    clearTimeout(reconnectTimer);
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("[WS] Received:", data);
      
      if (data.type === "alarm_ack") {
        if (data.success) {
          showStatus("設定を送信しました！", "success");
        } else {
          showStatus(`エラー: ${data.message}`, "error");
        }
      } else if (data.type === "stop_ack") {
        if (data.success) {
          showStatus("アラームを停止しました", "success");
        } else {
          showStatus(`エラー: ${data.message}`, "error");
        }
      } else if (data.type === "alarm_status") {
        // 次回アラーム時刻を更新
        console.log("[Status] Updating next alarm display:", data.nextAlarm);
        const nextAlarmEl = document.getElementById("nextAlarmTime");
        if (nextAlarmEl) {
          nextAlarmEl.textContent = data.nextAlarm || "--:--";
          console.log("[Status] Display updated to:", nextAlarmEl.textContent);
          
          if (data.status === "snooze") {
            nextAlarmEl.style.color = "#f59e0b"; // オレンジ（スヌーズ中）
            console.log("[Status] Color set to orange (snooze)");
          } else if (data.status === "stopped") {
            nextAlarmEl.style.color = "var(--subtext)";
            nextAlarmEl.textContent = "--:--";
            console.log("[Status] Color set to gray (stopped)");
          } else {
            nextAlarmEl.style.color = "var(--text)";
            console.log("[Status] Color set to default (set)");
          }
        } else {
          console.error("[Status] Element 'nextAlarmTime' not found!");
        }
      }
    } catch (e) {
      console.error("[WS] Parse error:", e);
    }
  };
  
  ws.onclose = () => {
    console.log("[WS] Disconnected");
    updateConnectionStatus(false);
    
    // 5秒後に再接続
    reconnectTimer = setTimeout(() => {
      console.log("[WS] Reconnecting...");
      connect();
    }, 5000);
  };
  
  ws.onerror = (err) => {
    console.error("[WS] Error:", err);
    showStatus("通信エラーが発生しました", "error");
  };
}

function updateConnectionStatus(connected) {
  const statusEl = document.querySelector(".status");
  
  if (connected) {
    statusEl.textContent = "✓ サーバーに接続中";
    statusEl.style.background = "#dcfce7";
    statusEl.style.color = "#166534";
  } else {
    statusEl.textContent = "✗ サーバーに未接続";
    statusEl.style.background = "#fee2e2";
    statusEl.style.color = "#991b1b";
  }
}

function showStatus(message, type) {
  const statusEl = document.querySelector(".status");
  const originalBg = statusEl.style.background;
  const originalColor = statusEl.style.color;
  const originalText = statusEl.textContent;
  
  // ステータスを一時的に変更
  if (type === "success") {
    statusEl.style.background = "#dcfce7";
    statusEl.style.color = "#166534";
  } else if (type === "error") {
    statusEl.style.background = "#fee2e2";
    statusEl.style.color = "#991b1b";
  } else {
    statusEl.style.background = "#dbeafe";
    statusEl.style.color = "#1e40af";
  }
  
  statusEl.textContent = message;
  
  // 3秒後に元に戻す
  setTimeout(() => {
    statusEl.style.background = originalBg;
    statusEl.style.color = originalColor;
    statusEl.textContent = originalText;
  }, 3000);
}

function sendAlarm() {
  const timeInput = document.getElementById("alarmTime");
  const enableCheckbox = document.getElementById("alarmEnable");
  
  if (!timeInput.value) {
    showStatus("時刻を入力してください", "error");
    return;
  }
  
  if (ws.readyState !== WebSocket.OPEN) {
    showStatus("サーバーに接続されていません", "error");
    return;
  }
  
  const [hour, minute] = timeInput.value.split(":").map(Number);
  
  // 次回アラーム時刻をクリア
  const nextAlarmEl = document.getElementById("nextAlarmTime");
  if (nextAlarmEl) {
    nextAlarmEl.textContent = "--:--";
    nextAlarmEl.style.color = "var(--subtext)";
  }
  
  console.log("[WS] Sending alarm settings");
  ws.send(JSON.stringify({
    type: "alarm",
    hour: hour,
    minute: minute,
    enable: document.getElementById("alarmEnable").checked,
    snooze: {
      enable: document.getElementById("snoozeEnable").checked,
      interval: Number(document.getElementById("snoozeInterval").value),
      count: Number(document.getElementById("snoozeCount").value)
    }
  }));

  showStatus("送信中...", "info");
}

function stopAlarm() {
  console.log("========================================");
  console.log("[STOP] Stop button clicked");
  console.log("========================================");
  
  if (ws.readyState !== WebSocket.OPEN) {
    console.error("[STOP] WebSocket not open. State:", ws.readyState);
    showStatus("サーバーに接続されていません", "error");
    return;
  }
  
  const stopCommand = { type: "stop" };
  console.log("[WS] Sending stop command:", JSON.stringify(stopCommand));
  
  ws.send(JSON.stringify(stopCommand));
  
  console.log("[STOP] Stop command sent successfully");
  showStatus("停止コマンドを送信中...", "info");
}

// ページ読み込み時に接続
window.addEventListener("load", () => {
  connect();
});

// ページ離脱時にクリーンアップ
window.addEventListener("beforeunload", () => {
  if (ws) {
    ws.close();
  }
  clearTimeout(reconnectTimer);
});
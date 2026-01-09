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
  const statusEl = document.getElementById("connectionStatus");
  const sendBtn = document.getElementById("sendBtn");
  
  if (connected) {
    statusEl.textContent = "✓ サーバーに接続中";
    statusEl.className = "connection-status connected";
    sendBtn.disabled = false;
  } else {
    statusEl.textContent = "✗ サーバーに未接続";
    statusEl.className = "connection-status disconnected";
    sendBtn.disabled = true;
  }
}

function showStatus(message, type) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = "block";
  
  // 3秒後に非表示
  setTimeout(() => {
    statusEl.style.display = "none";
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
  
  const alarmData = {
    type: "alarm",
    hour: hour,
    minute: minute,
    enable: enableCheckbox.checked
  };
  
  console.log("[WS] Sending:", alarmData);
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

// app.js - ESP32 Alarm Client-side JavaScript v27.02

const wsUrl = window.location.protocol === 'https:' 
  ? `wss://${window.location.host}`
  : `ws://${window.location.host}`;

let ws;
let reconnectTimer;

// ローカルストレージのキー
const STORAGE_KEYS = {
  alarmTime: 'esp32_alarm_time',
  alarmEnable: 'esp32_alarm_enable',
  snoozeEnable: 'esp32_snooze_enable',
  snoozeInterval: 'esp32_snooze_interval',
  snoozeCount: 'esp32_snooze_count'
};

// 設定を保存
function saveSettings() {
  localStorage.setItem(STORAGE_KEYS.alarmTime, document.getElementById('alarmTime').value);
  localStorage.setItem(STORAGE_KEYS.alarmEnable, document.getElementById('alarmEnable').checked);
  localStorage.setItem(STORAGE_KEYS.snoozeEnable, document.getElementById('snoozeEnable').checked);
  localStorage.setItem(STORAGE_KEYS.snoozeInterval, document.getElementById('snoozeInterval').value);
  localStorage.setItem(STORAGE_KEYS.snoozeCount, document.getElementById('snoozeCount').value);
  console.log('[Storage] Settings saved');
}

// 設定を読み込み
function loadSettings() {
  const alarmTime = localStorage.getItem(STORAGE_KEYS.alarmTime);
  const alarmEnable = localStorage.getItem(STORAGE_KEYS.alarmEnable);
  const snoozeEnable = localStorage.getItem(STORAGE_KEYS.snoozeEnable);
  const snoozeInterval = localStorage.getItem(STORAGE_KEYS.snoozeInterval);
  const snoozeCount = localStorage.getItem(STORAGE_KEYS.snoozeCount);
  
  if (alarmTime) document.getElementById('alarmTime').value = alarmTime;
  if (alarmEnable !== null) document.getElementById('alarmEnable').checked = (alarmEnable === 'true');
  if (snoozeEnable !== null) document.getElementById('snoozeEnable').checked = (snoozeEnable === 'true');
  if (snoozeInterval) document.getElementById('snoozeInterval').value = snoozeInterval;
  if (snoozeCount) document.getElementById('snoozeCount').value = snoozeCount;
  console.log('[Storage] Settings loaded');
}

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
      } else if (data.type === "alarm_status") {
        console.log("[Status] Updating next alarm display:", data.nextAlarm);

        const nextAlarmEl = document.getElementById("nextAlarmTime");

        if (!nextAlarmEl) {
          console.error("[Status] Element 'nextAlarmTime' not found!");
          return;
        }

        const time = data.nextAlarm || "--:--";
        nextAlarmEl.textContent = time;

        if (data.status === "stopped") {
          localStorage.removeItem("nextAlarmTime");
        } else {
          localStorage.setItem("nextAlarmTime", time);
        }

        console.log("[Status] Display updated to:", time);

        if (data.status === "snooze") {
          nextAlarmEl.style.color = "#f59e0b";
        } else if (data.status === "stopped") {
          nextAlarmEl.style.color = "var(--subtext)";
          nextAlarmEl.textContent = "--:--";
        } else {
          nextAlarmEl.style.color = "var(--text)";
        }
      } else if (data.type === "esp32_status") {
        updateEsp32Status(!!data.connected);
      }
    } catch (e) {
      console.error("[WS] Parse error:", e);
    }
  };
  
  ws.onerror = (err) => {
    console.error("[WS] Error:", err);
    showStatus("通信エラーが発生しました", "error");
  };
}

function updateConnectionStatus(connected) {
  const el = document.getElementById("statusClient");
  if (!el) return;
  el.textContent = connected ? "HTML: 接続中" : "HTML: 未接続";
  el.classList.toggle("disconnected", !connected);
}

function updateEsp32Status(connected) {
  const el = document.getElementById("statusEsp32");
  if (!el) return;
  el.textContent = connected ? "ESP32: 接続中" : "ESP32: 未接続";
  el.classList.toggle("disconnected", !connected);
}

function showStatus(message, type) {
  const statusEl = document.getElementById("statusClient");
  if (!statusEl) return;
  const originalText = statusEl.textContent;
  const originalDisconnected = statusEl.classList.contains("disconnected");

  statusEl.textContent = message;
  statusEl.classList.toggle("disconnected", type === "error");

  setTimeout(() => {
    statusEl.textContent = originalText;
    statusEl.classList.toggle("disconnected", originalDisconnected);
  }, 3000);
}

function sendAlarm() {
  const timeInput = document.getElementById("alarmTime");
  
  if (!timeInput.value) {
    showStatus("時刻を入力してください", "error");
    return;
  }
  
  if (ws.readyState !== WebSocket.OPEN) {
    showStatus("サーバーに接続されていません", "error");
    return;
  }
  
  const [hour, minute] = timeInput.value.split(":").map(Number);
  
  saveSettings();
  
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


function sendTimeSync() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    showStatus("サーバーに接続されていません", "error");
    return;
  }

  ws.send(JSON.stringify({ type: "time_sync" }));
  showStatus("時刻同期を要求しました", "info");
}


window.addEventListener("load", () => {
  loadSettings();
  connect();
});

window.addEventListener("beforeunload", () => {
  if (ws) {
    ws.close();
  }
  clearTimeout(reconnectTimer);
});

window.addEventListener("DOMContentLoaded", () => {
  const savedTime = localStorage.getItem("nextAlarmTime");
  const nextAlarmEl = document.getElementById("nextAlarmTime");

  if (savedTime && nextAlarmEl) {
    nextAlarmEl.textContent = savedTime;
    nextAlarmEl.style.color = "var(--text)";
    console.log("[Init] Restored next alarm from localStorage:", savedTime);
  }
});



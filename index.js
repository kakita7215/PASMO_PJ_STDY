// ESP32 側 WebSocket アドレス（必要なら変更）
const ws = new WebSocket("ws://192.168.1.50:81");

ws.onopen = () => {
  console.log("WebSocket connected");
};

ws.onerror = (e) => {
  console.error("WebSocket error", e);
};

function sendAlarm() {
  const t = document.getElementById("alarmTime").value;
  if (!t) {
    alert("時刻を設定しろ");
    return;
  }

  const [h, m] = t.split(":").map(Number);

  const data = {
    type: "alarm",
    hour: h,
    minute: m,
    enable: document.getElementById("alarmEnable").checked
  };

  ws.send(JSON.stringify(data));
  console.log("SEND:", data);
}

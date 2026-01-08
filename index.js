const ws = new WebSocket("wss://pasmo-pj-stdy.onrender.com");

ws.onopen = () => {
  console.log("WS connected");
};

function sendAlarm() {
  const t = document.getElementById("alarmTime").value;
  if (!t) return;

  const [h, m] = t.split(":").map(Number);

  ws.send(JSON.stringify({
    type: "alarm",
    hour: h,
    minute: m,
    enable: document.getElementById("alarmEnable").checked
  }));
}

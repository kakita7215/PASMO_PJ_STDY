
let ws = new WebSocket("ws://esp32.local/ws");

function sendAlarm() {
  const time = document.getElementById("alarmTime").value;
  const enable = document.getElementById("alarmEnable").checked;

  ws.send(JSON.stringify({
    alarm: time,
    enable: enable
  }));

  if (data.type === "alarm" && espSocket) {
    espSocket.send(JSON.stringify(data));
  }
  
}

function sendAlarm() {
  const time = document.getElementById("alarmTime").value;
  const enable = document.getElementById("alarmEnable").checked;

  if (!time) return;

  const [hour, minute] = time.split(":").map(Number);

  ws.send(JSON.stringify({
    type: "alarm",
    hour: hour,
    minute: minute,
    enable: enable
  }));
}

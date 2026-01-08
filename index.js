let ws=new WebSocket("ws://pasmo-pj-stdy.onrender.com/");

function send(){
  ws.send(JSON.stringify({
    alarm: document.getElementById("alarmTime").value,
    enable: document.getElementById("alarmEnable").checked
  }));
}

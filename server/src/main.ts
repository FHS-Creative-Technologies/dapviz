import './style.css'

const ws = new WebSocket(`ws://${location.host}/api/events`);

ws.addEventListener("open", (_e) => {
  console.log("connected to ws");
})

ws.addEventListener("message", (e) => {
  console.log("msg from ws: ", e.data);
});

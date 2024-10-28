const ws = new WebSocket(`ws://${location.host}/api/events`);

ws.addEventListener("open", (_e) => {
  console.log("connected to ws");
})

ws.addEventListener("message", (e) => {
  try {
    console.log(JSON.parse(e.data));
  } catch (err) {
    console.error("Invalid JSON:", e.data, err);
  }
});

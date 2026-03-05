import net from "net";

const host = "dpg-d5ov9ev5c7fs73aotkm0-a.oregon-postgres.render.com";
const port = 5432;

console.log(`Probing ${host}:${port}...`);

const socket = new net.Socket();

socket.setTimeout(5000);

socket.on("connect", () => {
  console.log("PORT OPEN!");
  socket.destroy();
  process.exit(0);
});

socket.on("timeout", () => {
  console.log("TIMEOUT");
  socket.destroy();
  process.exit(1);
});

socket.on("error", (err) => {
  console.log(`ERROR: ${err.message}`);
  process.exit(1);
});

socket.connect(port, host);

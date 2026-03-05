import tls from "tls";

const host = "dpg-d5ov9ev5c7fs73aotkm0-a.oregon-postgres.render.com";
const port = 5432;

console.log(`Starting TLS probe to ${host}:${port}...`);

const options = {
  rejectUnauthorized: false,
  servername: host,
};

const socket = tls.connect(port, host, options, () => {
  console.log("TLS CONNECTED");
  console.log("Cipher:", socket.getCipher());
  console.log("Authorized:", socket.authorized);
  socket.end();
  process.exit(0);
});

socket.on("error", (err) => {
  console.log(`TLS ERROR: ${err.message}`);
  process.exit(1);
});

socket.setTimeout(10000, () => {
  console.log("TLS TIMEOUT");
  socket.destroy();
  process.exit(1);
});

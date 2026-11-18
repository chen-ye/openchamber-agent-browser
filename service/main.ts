import { startExtensionServer } from "./server.ts";

const port = Number(process.env.OPENCHAMBER_SERVICE_PORT);
const token = process.env.OPENCHAMBER_SERVICE_TOKEN ?? "";

if (!Number.isInteger(port) || port <= 0 || !token) {
  process.stderr.write(
    "Missing OPENCHAMBER_SERVICE_PORT or OPENCHAMBER_SERVICE_TOKEN\n",
  );
  process.exit(1);
}

const running = await startExtensionServer({ port, token });

const shutdown = () => {
  void running.close().finally(() => process.exit(0));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

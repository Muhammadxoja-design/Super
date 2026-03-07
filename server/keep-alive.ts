import { log } from "./index";

/**
 * Render free tier services spin down after 15 minutes of inactivity.
 * This function pings the service every 10 minutes to keep it alive.
 */
export function setupKeepAlive() {
  const url = process.env.WEBAPP_URL || process.env.RENDER_EXTERNAL_URL;

  if (!url) {
    log(
      "Keep-alive skipped: WEBAPP_URL or RENDER_EXTERNAL_URL not found",
      "keep-alive",
    );
    return;
  }

  log(`Keep-alive initialized for: ${url}`, "keep-alive");

  // Ping every 10 minutes (600,000 ms)
  setInterval(
    async () => {
      try {
        const healthUrl = `${url.replace(/\/+$/, "")}/health`;
        const response = await fetch(healthUrl);
        if (response.ok) {
          log(`Self-ping successful: ${healthUrl}`, "keep-alive");
        } else {
          log(`Self-ping failed with status: ${response.status}`, "keep-alive");
        }
      } catch (error: any) {
        log(`Self-ping error: ${error.message}`, "keep-alive");
      }
    },
    10 * 60 * 1000,
  );
}

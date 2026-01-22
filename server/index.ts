import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { waitForDatabase } from "./db";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  const allowedOrigins = (process.env.WEBAPP_URL || process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isAllowed =
      !origin ||
      allowedOrigins.length === 0 ||
      allowedOrigins.includes(origin);

    if (origin && isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }

    if (isAllowed) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        log(logLine);
      }
    });

    next();
  });

  return app;
}

async function startServer() {
  log("Starting server...");

  const app = createApp();
  const httpServer = createServer(app);

  const dbReady = await waitForDatabase({ logger: console });
  if (!dbReady) {
    console.error("Database not ready after retries. Exiting.");
    process.exit(1);
  }

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const portValue = process.env.PORT;
  if (!portValue && process.env.NODE_ENV === "production") {
    console.error("PORT is required in production.");
    process.exit(1);
  }
  const port = parseInt(portValue || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`Listening on PORT=${port}`);
    },
  );
}

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});

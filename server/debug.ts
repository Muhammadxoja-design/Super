import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";

const DEBUG_ENABLED = process.env.SERVER_DEBUG === "1";
const mapCache = new Map<string, TraceMap>();

function loadSourceMap(sourceFile: string) {
  const mapPath = `${sourceFile}.map`;
  if (!fs.existsSync(mapPath)) return null;
  if (!mapCache.has(mapPath)) {
    const raw = fs.readFileSync(mapPath, "utf-8");
    mapCache.set(mapPath, new TraceMap(JSON.parse(raw)));
  }
  return mapCache.get(mapPath) || null;
}

function resolveFilePath(rawPath: string) {
  if (rawPath.startsWith("file://")) {
    return fileURLToPath(rawPath);
  }
  return rawPath;
}

function mapStackLine(line: string) {
  const match = line.match(/\((.*):(\d+):(\d+)\)$/) ||
    line.match(/at (.*):(\d+):(\d+)$/);
  if (!match) return line;
  const [, rawFile, rawLine, rawColumn] = match;
  const sourceFile = resolveFilePath(rawFile);
  const map = loadSourceMap(sourceFile);
  if (!map) return line;
  const position = originalPositionFor(map, {
    line: Number(rawLine),
    column: Number(rawColumn),
  });
  if (!position.source || position.line == null || position.column == null) {
    return line;
  }
  const resolvedSource = path.resolve(path.dirname(sourceFile), position.source);
  return line.replace(
    rawFile + ":" + rawLine + ":" + rawColumn,
    `${resolvedSource}:${position.line}:${position.column}`,
  );
}

function mapStack(stack?: string) {
  if (!stack) return "";
  return stack
    .split("\n")
    .map((line) => mapStackLine(line))
    .join("\n");
}

export function installServerDebug() {
  if (!DEBUG_ENABLED) return;

  const logMappedError = (error: unknown, label: string) => {
    if (error instanceof Error) {
      const mappedStack = mapStack(error.stack);
      console.error(`[debug] ${label}:`, mappedStack || error.stack || error);
    } else {
      console.error(`[debug] ${label}:`, error);
    }
  };

  process.on("uncaughtException", (error) => {
    logMappedError(error, "uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    logMappedError(
      reason instanceof Error ? reason : new Error(String(reason)),
      "unhandledRejection",
    );
  });
}

export function debugValue(label: string, value: unknown) {
  if (!DEBUG_ENABLED) return;
  const type = typeof value;
  const isFunction = type === "function";
  console.log(`[debug] ${label}`, { type, isFunction });
}

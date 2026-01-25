import * as telegrafPkg from "telegraf";
import { debugValue } from "./debug";

type TelegrafExports = typeof import("telegraf");
type TelegrafMaybeDefault = TelegrafExports & { default?: TelegrafExports | unknown };

const resolvedExports = telegrafPkg as TelegrafMaybeDefault;
const resolvedDefault = resolvedExports.default ?? resolvedExports;
const telegrafConstructorCandidate =
  (resolvedDefault as TelegrafExports).Telegraf ?? resolvedDefault;
const markupCandidate =
  (resolvedDefault as TelegrafExports).Markup ?? resolvedExports.Markup;

if (!telegrafConstructorCandidate || !markupCandidate) {
  throw new Error("Failed to resolve telegraf exports. Check module format.");
}

debugValue("telegraf.TelegrafConstructor", telegrafConstructorCandidate);
debugValue("telegraf.Markup", markupCandidate);

export const TelegrafConstructor =
  telegrafConstructorCandidate as TelegrafExports["Telegraf"];
export const Markup = markupCandidate as TelegrafExports["Markup"];
export type { Telegraf } from "telegraf";

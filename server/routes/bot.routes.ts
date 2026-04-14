import { Telegraf } from "telegraf";
import * as botController from "../controllers/bot.controller";
import { normalizeWebhookPath, createUpdateLogger } from "../utils/helpers";

export function setupBotHandlers(bot: Telegraf<any>, webAppUrl?: string) {
  const helpText = `Mavjud buyruqlar:
/start - Boshlash
/register - Ro'yxatdan o'tish
/newtask - Yangi topshiriq (Admin)
/assign - Topshiriq biriktirish (Admin)
/tasks - Mening topshiriqlarim
/active - Faol topshiriqlar
/pending - Kutilayotgan topshiriqlar
/done - Bajarilgan topshiriqlar
/help - Yordam`;

  bot.command("start", (ctx) => botController.startHandler(ctx, webAppUrl));
  bot.command("register", (ctx) => botController.registerHandler(ctx, webAppUrl));
  bot.command("newtask", botController.newTaskHandler);
  bot.command("assign", botController.assignHandler);
  bot.command("tasks", botController.tasksHandler);
  bot.command("active", botController.activeTasksHandler);
  bot.command("pending", botController.pendingTasksHandler);
  bot.command("done", botController.doneTasksHandler);
  bot.command("help", (ctx) => botController.helpHandler(ctx, helpText));

  bot.on("contact", botController.contactHandler);
  bot.on("text", botController.textHandler);
  bot.on("photo", botController.photoHandler);
  bot.on("callback_query", botController.callbackQueryHandler);
}

export function setupBotWebhook(app: any, bot: Telegraf<any>) {
  const webhookPath = normalizeWebhookPath(process.env.WEBHOOK_PATH || "/telegraf");
  const updateLogger = createUpdateLogger(console);
  
  const webhookCallback = bot.webhookCallback(webhookPath);
  app.post(webhookPath, (req: any, res: any, next: any) => {
    updateLogger(req.body ?? {});
    return webhookCallback(req, res, next);
  });
  
  return webhookPath;
}

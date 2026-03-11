import { Markup } from "./telegraf";

export function buildTaskStatusKeyboard(assignmentId: number, webAppUrl?: string) {
  const buttons: any[][] = [
    [
      Markup.button.callback(
        "✅ Qildim",
        `task_status:${assignmentId}:DONE`,
      ),
      Markup.button.callback(
        "❌ Qila olmadim",
        `task_status:${assignmentId}:CANNOT_DO`,
      ),
    ],
    [
      Markup.button.callback(
        "⏳ Kutilmoqda",
        `task_status:${assignmentId}:PENDING`,
      ),
      Markup.button.callback(
        "🚀 Endi qilaman",
        `task_status:${assignmentId}:WILL_DO`,
      ),
    ],
    [
      Markup.button.callback(
        "🔥 Faol",
        `task_status:${assignmentId}:ACTIVE`,
      ),
    ],
  ];

  if (webAppUrl) {
    buttons.push([Markup.button.webApp("Batafsil", webAppUrl)]);
  }

  return Markup.inlineKeyboard(buttons);
}

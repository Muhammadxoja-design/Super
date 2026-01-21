import { Markup } from "telegraf";

export function buildTaskStatusKeyboard(assignmentId: number, webAppUrl?: string) {
  const buttons = [
    [
      Markup.button.callback(
        "Qabul qildim",
        `task_status:${assignmentId}:accepted`,
      ),
      Markup.button.callback(
        "Jarayonda",
        `task_status:${assignmentId}:in_progress`,
      ),
    ],
    [
      Markup.button.callback(
        "Rad etdim",
        `task_status:${assignmentId}:rejected`,
      ),
      Markup.button.callback(
        "Bajarildi",
        `task_status:${assignmentId}:done`,
      ),
    ],
  ];

  if (webAppUrl) {
    buttons.push([Markup.button.webApp("Batafsil", webAppUrl)]);
  }

  return Markup.inlineKeyboard(buttons);
}

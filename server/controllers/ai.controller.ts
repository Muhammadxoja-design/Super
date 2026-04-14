import { Request, Response } from "express";

export const explainTaskByAI = async (req: Request, res: Response) => {
    const { taskTitle, taskDescription, question } = req.body;
    if (!taskTitle) {
      return res.status(400).json({ message: "Task title is required" });
    }

    const apiKey = process.env.AI_API_KEY;
    const apiUrl =
      process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";

    // Smart Fallback if no API key
    if (!apiKey) {
      const fallbackAnswer = `Ushbu topshiriq: "${taskTitle}" ni quyidagi bosqichlarda bajarishingizni maslahat beraman:

1. Topshiriq shartlarini diqqat bilan o'qib chiqing.
2. Kerakli resurslar va vaqtni rejalashtiring.
3. Amaliy qadamlarni ketma-ketlikda bajaring.
4. Natijani tekshiring va agar topshiriq dalil (proof) talab qilsa, rasm yoki matn tayyorlang.

Savolingiz: "${question || "Tushuntirib bering"}" bo'yicha qo'shimcha yordam kerak bo'lsa, iltimos administratorga murojaat qiling.`;

      return res.json({
        answer: fallbackAnswer,
        isFallback: true,
        steps: ["Rejalashtirish", "Tayyorgarlik", "Bajarish", "Tekshirish"],
      });
    }

    try {
      const prompt = `Siz TaskBotFergana platformasi uchun AI yordamchisiz.
Foydalanuvchiga quyidagi topshiriqni tushunishga va bajarishga yordam bering.
Topshiriq sarlavhasi: ${taskTitle}
Tavsif: ${taskDescription || "Tavsif yo'q"}
Foydalanuvchi savoli: ${question || "Menga buni oddiy qilib tushuntirib ber va amaliy reja tuzib ber."}

Javobni O'zbek tilida, samimiy, tushunarli va amaliy (action-oriented) tarzda yozing.
Agar reja so'ralsa, uni raqamlangan ro'yxat ko'rinishida bering.`;

      const aiRes = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      if (!aiRes.ok) {
        const errorData = await aiRes.json();
        console.error("AI API Error:", errorData);
        throw new Error("AI API failed");
      }

      const data = await aiRes.json();
      const answer =
        data.choices?.[0]?.message?.content ||
        "Kechirasiz, AI javob bera olmadi.";

      res.json({
        answer,
        isFallback: false,
      });
    } catch (error) {
      console.error("AI Explain Error:", error);
      res
        .status(500)
        .json({ message: "AI yordamchi ishida xatolik yuz berdi" });
    }
};

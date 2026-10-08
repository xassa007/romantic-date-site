const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "15kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/date-invitation", async (req, res) => {
  try {
    const { name, date, time, place, customPlace, activities, wishes } = req.body || {};
    const fields = [name, date, time, place];

    if (fields.some(v => typeof v !== "string" || !v.trim())) {
      return res.status(400).json({ error: "Пожалуйста, заполни обязательные поля." });
    }
    if (name.length > 60 || date.length > 10 || time.length > 30 ||
        place.length > 100 || String(customPlace || "").length > 180 ||
        String(wishes || "").length > 1000) {
      return res.status(400).json({ error: "Пожалуйста, проверь введённые данные." });
    }
    if (!process.env.BOT_TOKEN || !process.env.CHAT_ID) {
      return res.status(500).json({ error: "Настройка Telegram ещё не завершена." });
    }

    const safe = v => String(v || "Не указано")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const selected = Array.isArray(activities)
      ? activities.filter(v => typeof v === "string").slice(0, 6)
      : [];

    const message = [
      "💌 <b>Новый ответ на приглашение!</b>",
      "",
      "🥰 <b>Имя:</b> " + safe(name),
      "📅 <b>Дата:</b> " + safe(date),
      "🕰 <b>Время:</b> " + safe(time),
      "📍 <b>Место:</b> " + safe(place),
      "🗺 <b>Дополнительно:</b> " + safe(customPlace),
      "✨ <b>Что хочется:</b> " + safe(selected.length ? selected.join(", ") : "Не выбрано"),
      "💗 <b>Пожелания:</b> " + safe(wishes)
    ].join("\n");

    const tg = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.CHAT_ID,
        text: message,
        parse_mode: "HTML"
      })
    });
    const result = await tg.json();
    if (!tg.ok || !result.ok) {
      console.error("Telegram delivery error:", result);
      return res.status(502).json({ error: "Не удалось отправить сообщение в Telegram." });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Request error:", err);
    res.status(500).json({ error: "Что-то пошло не так. Попробуй ещё раз." });
  }
});

app.listen(PORT, () => console.log(`Invitation site listening on ${PORT}`));

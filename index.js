// 📁 index.js
require("dotenv").config();
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.TELEGRAM_TOKEN;
const CHANNEL = process.env.CHANNEL_USERNAME;
const TMDB_KEY = process.env.TMDB_API_KEY;
const LANGUAGE = process.env.LANGUAGE || "ru";
const PUBLISH_COUNT = parseInt(process.env.PUBLISH_COUNT) || 2;
const PUBLISH_HOURS = (process.env.PUBLISH_HOURS || "12,20")
  .split(",")
  .map((h) => parseInt(h));

const bot = new TelegramBot(TOKEN);

function generateSeoDescription(movie) {
  return `🎬 ${movie.title || movie.name} — ${movie.release_date?.slice(0, 4) || "Новый"} ${
    movie.media_type === "tv" ? "сериал" : "фильм"
  }. ${movie.overview?.slice(0, 300) || "Описание отсутствует."}

📺 Смотреть трейлер: https://www.youtube.com/results?search_query=${encodeURIComponent(
    movie.title || movie.name
  )}+трейлер

🎞️ Ещё новинки кино: https://www.youtube.com/@KinoBuzz/videos`;
}

async function getTrending() {
  try {
    const url = `https://api.themoviedb.org/3/trending/all/day?language=${LANGUAGE}`;
    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${TMDB_KEY}`,
        accept: "application/json",
      },
    });
    return res.data.results.slice(0, 10);
  } catch (err) {
    console.error("Ошибка при получении фильмов:", err.message);
    return [];
  }
}

async function publish() {
  const now = new Date();
  const currentHour = now.getUTCHours();
  const kievOffset = 3; // UTC+3 летом
  const localHour = (currentHour + kievOffset) % 24;

  if (!PUBLISH_HOURS.includes(localHour)) {
    console.log("🕒 Сейчас", localHour, "— не время публикации");
    return;
  }

  console.log("\nРасписание публикаций установлено:", PUBLISH_HOURS);
  console.log("Начинаем публикацию...");

  const movies = await getTrending();
  const selected = movies.slice(0, PUBLISH_COUNT);

  for (const movie of selected) {
    const title = movie.title || movie.name;
    const imageUrl = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : null;

    const text = `⭐️ <b>${title}</b>\n\n${generateSeoDescription(movie)}`;

    try {
      await bot.sendPhoto(CHANNEL, imageUrl, {
        caption: text,
        parse_mode: "HTML",
      });
    } catch (err) {
      console.error("Ошибка отправки в Telegram:", err.message);
    }
  }

  console.log("Публикация завершена.\n");
}

publish();

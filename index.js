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
  .map((h) => parseInt(h.trim()));

const bot = new TelegramBot(TOKEN);

function generateSeoDescription(movie) {
  return `🎬 ${movie.title || movie.name} — ${movie.release_date?.slice(0, 4) || "Новый"} ${movie.media_type === "tv" ? "сериал" : "фильм"}.
${movie.overview?.slice(0, 300) || "Описание отсутствует."}

📺 Смотреть трейлер: https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title || movie.name)}+трейлер

🎞️ Ещё новинки кино: https://www.youtube.com/@KinoBuzz/videos`;
}

async function getTrending() {
  try {
    const url = `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_KEY}&language=${LANGUAGE}`;
    const res = await axios.get(url);
    return res.data.results.filter(m => m.poster_path);
  } catch (err) {
    console.error("Ошибка при получении фильмов:", err.message);
    return [];
  }
}

async function publish() {
  const now = new Date();
  const localHour = (now.getUTCHours() + 3) % 24;

  if (!PUBLISH_HOURS.includes(localHour)) {
    console.log("🕒 Сейчас", localHour, "— не время публикации");
    return;
  }

  console.log("📅 Время публикации наступило:", localHour);

  const movies = await getTrending();
  if (!movies.length) {
    console.log("❌ Нет фильмов для публикации");
    return;
  }

  const selected = movies.slice(0, PUBLISH_COUNT);

  for (const movie of selected) {
    const text = `⭐️ <b>${movie.title || movie.name}</b>\n\n${generateSeoDescription(movie)}`;
    const imageUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;

    try {
      await bot.sendPhoto(CHANNEL, imageUrl, {
        caption: text,
        parse_mode: "HTML",
      });
      console.log(`✅ Отправлено: ${movie.title || movie.name}`);
    } catch (err) {
      console.error("Ошибка отправки:", err.message);
    }
  }

  console.log("✅ Публикация завершена");
}

publish();

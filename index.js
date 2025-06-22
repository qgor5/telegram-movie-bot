// index.js

require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: false });
const CHANNEL = process.env.CHANNEL_USERNAME;
const TMDB_KEY = process.env.TMDB_API_KEY;
const LANG = process.env.LANGUAGE || 'ru';
const PUBLISH_COUNT = parseInt(process.env.PUBLISH_COUNT || '3');
const PUBLISH_HOURS = process.env.PUBLISH_HOURS ? process.env.PUBLISH_HOURS.split(',') : ['15', '18'];
const postedFile = path.join(__dirname, 'posted.json');

if (!fs.existsSync(postedFile)) fs.writeFileSync(postedFile, '[]');

async function getNewMovies() {
  const today = new Date().toISOString().split('T')[0];
  const res = await axios.get(`https://api.themoviedb.org/3/discover/movie`, {
    params: {
      api_key: TMDB_KEY,
      language: LANG,
      sort_by: 'release_date.desc',
      include_adult: false,
      page: 1,
      'release_date.lte': today
    }
  });
  return res.data.results.slice(0, 10);
}

async function getTrailer(movieId) {
  const res = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}/videos`, {
    params: {
      api_key: TMDB_KEY,
      language: LANG
    }
  });

  const yt = res.data.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
  return yt ? `https://www.youtube.com/watch?v=${yt.key}` : null;
}

function loadPosted() {
  return JSON.parse(fs.readFileSync(postedFile));
}

function savePosted(list) {
  fs.writeFileSync(postedFile, JSON.stringify(list));
}

function generateText(movie) {
  const textTemplates = [
    `🎬 *${movie.title}* (${movie.release_date?.slice(0, 4)})\n\n${movie.overview}\n\n⭐️ Рейтинг: ${movie.vote_average}/10`,
    `🔥 Новинка! *${movie.title}* уже вышел.\n\n${movie.overview}\n\n📅 Год: ${movie.release_date?.slice(0, 4)} | ⭐️ ${movie.vote_average}`,
    `🌟 Фильм: *${movie.title}*\n📆 Премьера: ${movie.release_date}\n\n${movie.overview}`
  ];
  const random = Math.floor(Math.random() * textTemplates.length);
  return textTemplates[random];
}

async function postMovies() {
  const posted = loadPosted();
  const movies = await getNewMovies();
  let count = 0;

  for (let movie of movies) {
    if (posted.includes(movie.id)) continue;
    const trailer = await getTrailer(movie.id);
    const text = generateText(movie);
    const poster = `https://image.tmdb.org/t/p/w780${movie.poster_path}`;

    const caption = `${text}${trailer ? `\n\n▶️ [Смотреть трейлер](${trailer})` : ''}`;

    await bot.sendPhoto(CHANNEL, poster, {
      caption,
      parse_mode: 'Markdown'
    });

    posted.push(movie.id);
    count++;
    if (count >= PUBLISH_COUNT) break;
  }

  savePosted(posted);
}

function checkTime() {
  const hour = new Date().getHours().toString();
  if (PUBLISH_HOURS.includes(hour)) {
    console.log(`⏰ ${hour}:00 — публикация началась`);
    postMovies();
  } else {
    console.log(`🕒 Сейчас ${hour}:00 — не время публикации`);
  }
}

checkTime();
setInterval(checkTime, 60 * 60 * 1000); // Проверяет каждый час
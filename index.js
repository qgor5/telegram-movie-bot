require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const { generateSeoText } = require('./seoTextGenerator');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const PUBLISH_COUNT = parseInt(process.env.PUBLISH_COUNT) || 2;
const PUBLISH_HOURS = process.env.PUBLISH_HOURS ? process.env.PUBLISH_HOURS.split(',').map(Number) : [12, 20];
const LANGUAGE = process.env.LANGUAGE || 'ru';
const REGION = process.env.REGION || 'UA';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

let publishedIds = new Set(); // для исключения повторов

async function fetchMovies(type = 'movie', page = 1) {
  // Получаем популярные фильмы/сериалы/мультфильмы с TMDb
  try {
    const url = `${TMDB_BASE_URL}/${type}/popular`;
    const res = await axios.get(url, {
      params: {
        api_key: TMDB_API_KEY,
        language: LANGUAGE,
        page,
        region: REGION
      }
    });
    return res.data.results;
  } catch (error) {
    console.error('Ошибка при получении фильмов:', error.message);
    return [];
  }
}

async function fetchVideos(type, id) {
  // Получаем трейлеры фильма/сериала
  try {
    const url = `${TMDB_BASE_URL}/${type}/${id}/videos`;
    const res = await axios.get(url, {
      params: { api_key: TMDB_API_KEY, language: LANGUAGE }
    });
    // Ищем первый трейлер на YouTube
    const videos = res.data.results;
    const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer');
    return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
  } catch {
    return null;
  }
}

async function fetchDetails(type, id) {
  // Получаем полные данные о фильме/сериале
  try {
    const url = `${TMDB_BASE_URL}/${type}/${id}`;
    const res = await axios.get(url, {
      params: { api_key: TMDB_API_KEY, language: LANGUAGE }
    });
    return res.data;
  } catch {
    return null;
  }
}

function formatGenres(genres) {
  if (!genres || genres.length === 0) return 'Неизвестно';
  return genres.map(g => g.name).join(', ');
}

async function preparePost(type, movie) {
  const details = await fetchDetails(type, movie.id);
  if (!details) return null;

  if (publishedIds.has(details.id)) return null; // Уже публиковали

  const seoText = generateSeoText(details);
  const genres = formatGenres(details.genres);
  const year = details.release_date ? details.release_date.slice(0, 4) : (details.first_air_date ? details.first_air_date.slice(0, 4) : '—');
  const trailerUrl = await fetchVideos(type, details.id);

  const posterUrl = details.poster_path ? `${TMDB_IMAGE_BASE}${details.poster_path}` : null;
  const tmdbUrl = type === 'movie' ? `https://www.themoviedb.org/movie/${details.id}` :
                  type === 'tv' ? `https://www.themoviedb.org/tv/${details.id}` : '';

  // Формируем текст поста
  let message = `🎬 <b>${details.title || details.name} (${year})</b>\n`;
  message += `📅 Жанры: ${genres}\n\n`;
  message += `${seoText}\n\n`;
  if (trailerUrl) message += `🎥 <a href="${trailerUrl}">Смотреть трейлер</a>\n\n`;
  if (posterUrl) message += `<a href="${posterUrl}">&#8205;</a>\n`; // Для показа картинки

  message += `📺 Больше новинок на YouTube:\n👉 https://www.youtube.com/@KinoBuzz/videos\n\n`;
  message += `<a href="${tmdbUrl}">Подробнее на TMDb</a>`;

  publishedIds.add(details.id);

  return { message, posterUrl };
}

async function publishPosts() {
  console.log('Начинаем публикацию...');

  const types = ['movie', 'tv']; // фильмы и сериалы
  // Можно добавить мультфильмы как отдельный тип или фильтровать по жанрам

  let posts = [];

  for (const type of types) {
    const movies = await fetchMovies(type);
    for (const movie of movies) {
      if (posts.length >= PUBLISH_COUNT) break;
      const post = await preparePost(type, movie);
      if (post) posts.push(post);
    }
    if (posts.length >= PUBLISH_COUNT) break;
  }

  for (const post of posts) {
    try {
      if (post.posterUrl) {
        await bot.sendPhoto(CHANNEL_USERNAME, post.posterUrl, { caption: post.message, parse_mode: 'HTML', disable_web_page_preview: false });
      } else {
        await bot.sendMessage(CHANNEL_USERNAME, post.message, { parse_mode: 'HTML', disable_web_page_preview: false });
      }
      console.log('Опубликовано:', post.message.split('\n')[0]);
      await new Promise(r => setTimeout(r, 2000)); // чтобы не спамить слишком быстро
    } catch (e) {
      console.error('Ошибка при публикации:', e.message);
    }
  }

  console.log('Публикация завершена.');
}

function schedulePosts() {
  for (const hour of PUBLISH_HOURS) {
    schedule.scheduleJob({ hour, minute: 0, tz: 'Europe/Kiev' }, () => {
      publishPosts();
    });
  }
  console.log('Расписание публикаций установлено:', PUBLISH_HOURS);
}

schedulePosts();
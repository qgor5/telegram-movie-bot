// index.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();

// Твой ключ TMDb в .env файле: TMDB_API_KEY=твой_ключ_сюда

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // Добавь в .env токен бота
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;     // Добавь в .env чат id

// Пример жанров с TMDb (можно расширить)
const genres = {
  мультфильмы: 16,
  боевик: 28,
  драма: 18,
  комедия: 35,
};

// Функция для получения случайного популярного фильма по жанру
async function getRandomMovie(genreId) {
  const url = `https://api.themoviedb.org/3/discover/movie?with_genres=${genreId}&language=ru-RU&sort_by=popularity.desc&api_key=${process.env.TMDB_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw new Error('Фильмы не найдены');
  }

  // Случайный фильм из первых 20 популярных
  const randomIndex = Math.floor(Math.random() * Math.min(20, data.results.length));
  return data.results[randomIndex];
}

// Заготовка для отправки в Telegram (можно заменить на реальную интеграцию)
async function postMovie(genre) {
  try {
    const genreId = genres[genre.toLowerCase()];
    if (!genreId) {
      console.log(`Жанр "${genre}" не найден.`);
      return;
    }
    const movie = await getRandomMovie(genreId);
    const message = `
🎬 <b>${movie.title}</b> (${movie.release_date})

📜 Описание: ${movie.overview || 'Описание отсутствует'}

🌟 Рейтинг: ${movie.vote_average} / 10

▶ Трейлер: https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' трейлер')}

#${genre}
    `;

    // Здесь добавь код отправки message в Telegram через API или библиотеку (например, node-telegram-bot-api)

    console.log('Сообщение для Telegram:');
    console.log(message);

  } catch (error) {
    console.error('Ошибка при получении фильма:', error);
  }
}

// Пример вызова — выбирает и показывает фильм из жанра "мультфильмы"
postMovie('мультфильмы');
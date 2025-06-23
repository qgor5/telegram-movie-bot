// Модуль генерации SEO-оптимизированного описания для фильма

function generateSeoText(movie) {
  // Берём название, жанры, год, краткое описание
  const title = movie.title || movie.name || 'Фильм';
  const year = movie.release_date ? movie.release_date.slice(0, 4) : '2024';
  const genres = movie.genres?.map(g => g.name).join(', ') || '';
  const overview = movie.overview || 'Описание отсутствует.';

  // Пример уникального SEO текста с ключевыми словами
  return `${title} (${year}) — захватывающий ${genres.toLowerCase()} фильм. ${overview} Смотреть трейлер и узнать больше новинок кино можно в нашем Telegram-канале.`;
}

module.exports = { generateSeoText };
const bcrypt = require('bcrypt');
const db = require('./database');

db.exec('DELETE FROM likes');
db.exec('DELETE FROM reviews');
db.exec('DELETE FROM movie_genres');
db.exec('DELETE FROM movies');
db.exec('DELETE FROM genres');
db.exec('DELETE FROM users');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('likes', 'reviews', 'movies', 'genres', 'users')");

const passwordHash = bcrypt.hashSync('qwerty123', 10);

const insertUser = db.prepare(
  'INSERT INTO users (username, email, password, role, bio) VALUES (?, ?, ?, ?, ?)'
);

const adminId = insertUser.run('admin', 'admin@movies.com', passwordHash, 'admin', 'Главный администратор').lastInsertRowid;
const modId = insertUser.run('moderator', 'moderator@movies.com', passwordHash, 'moderator', 'Слежу за порядком').lastInsertRowid;
const userId = insertUser.run('user', 'user@movies.com', passwordHash, 'user', 'Люблю кино').lastInsertRowid;

const insertGenre = db.prepare('INSERT INTO genres (name) VALUES (?)');
const genreIds = {
  drama: insertGenre.run('Драма').lastInsertRowid,
  fantasy: insertGenre.run('Фантастика').lastInsertRowid,
  thriller: insertGenre.run('Триллер').lastInsertRowid,
};

const insertMovie = db.prepare(
  'INSERT INTO movies (title, director, year, country, description, posterUrl, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

const movies = [
  {
    title: 'Побег из Шоушенка',
    director: 'Фрэнк Дарабонт',
    year: 1994,
    country: 'США',
    description: 'История о надежде и дружбе в стенах тюрьмы.',
    posterUrl: 'https://placehold.co/400x600?text=Shawshank',
    genres: [genreIds.drama],
  },
  {
    title: 'Начало',
    director: 'Кристофер Нолан',
    year: 2010,
    country: 'США',
    description: 'Вор проникает в сны людей, чтобы украсть идеи.',
    posterUrl: 'https://placehold.co/400x600?text=Inception',
    genres: [genreIds.fantasy, genreIds.thriller],
  },
  {
    title: 'Интерстеллар',
    director: 'Кристофер Нолан',
    year: 2014,
    country: 'США',
    description: 'Путешествие через космический портал в поисках нового дома.',
    posterUrl: 'https://placehold.co/400x600?text=Interstellar',
    genres: [genreIds.fantasy, genreIds.drama],
  },
  {
    title: 'Криминальное чтиво',
    director: 'Квентин Тарантино',
    year: 1994,
    country: 'США',
    description: 'Несколько пересекающихся историй из жизни гангстеров.',
    posterUrl: 'https://placehold.co/400x600?text=Pulp+Fiction',
    genres: [genreIds.thriller, genreIds.drama],
  },
  {
    title: 'Матрица',
    director: 'Лана Вачовски',
    year: 1999,
    country: 'США',
    description: 'Хакер узнаёт, что мир — симуляция.',
    posterUrl: 'https://placehold.co/400x600?text=Matrix',
    genres: [genreIds.fantasy, genreIds.thriller],
  },
];

const insertMovieGenre = db.prepare(
  'INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)'
);

const movieIds = movies.map((m) => {
  const id = insertMovie.run(
    m.title,
    m.director,
    m.year,
    m.country,
    m.description,
    m.posterUrl,
    adminId
  ).lastInsertRowid;

  m.genres.forEach((gId) => insertMovieGenre.run(id, gId));

  return id;
});

const insertReview = db.prepare(
  'INSERT INTO reviews (movie_id, user_id, rating, title, body, status) VALUES (?, ?, ?, ?, ?, ?)'
);

const reviews = [
  { movieIndex: 0, userId, rating: 10, title: 'Лучший фильм', body: 'Пересматриваю каждый год.', status: 'approved' },
  { movieIndex: 1, userId, rating: 9, title: 'Мозг кипит', body: 'Нолан в лучшей форме.', status: 'approved' },
  { movieIndex: 2, userId: modId, rating: 10, title: 'Космос и любовь', body: 'Тронуло до слёз.', status: 'approved' },
  { movieIndex: 3, userId, rating: 8, title: 'Классика', body: 'Тарантино как всегда.', status: 'approved' },
  { movieIndex: 4, userId, rating: 9, title: 'Легенда', body: 'Матрица опередила время.', status: 'pending' },
];

const reviewIds = reviews.map((r) => {
  return insertReview.run(
    movieIds[r.movieIndex],
    r.userId,
    r.rating,
    r.title,
    r.body,
    r.status
  ).lastInsertRowid;
});

const insertLike = db.prepare(
  'INSERT INTO likes (review_id, user_id) VALUES (?, ?)'
);

insertLike.run(reviewIds[0], modId);
insertLike.run(reviewIds[0], userId);
insertLike.run(reviewIds[1], adminId);
insertLike.run(reviewIds[2], userId);
insertLike.run(reviewIds[3], modId);

console.log('✅ База заполнена:');
console.log('   Пользователей: 3 (admin, moderator, user)');
console.log(`   Жанров: 3`);
console.log(`   Фильмов: ${movies.length}`);
console.log(`   Рецензий: ${reviews.length}`);
console.log(`   Лайков: 5`);
console.log('');
console.log('🔑 Креды:');
console.log('   admin:qwerty123');
console.log('   moderator:qwerty123');
console.log('   user:qwerty123');
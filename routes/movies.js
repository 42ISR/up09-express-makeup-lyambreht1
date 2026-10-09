const express = require('express');
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

function attachGenres(movies) {
  const genreStmt = db.prepare(`
    SELECT genres.id, genres.name
    FROM movie_genres
    JOIN genres ON movie_genres.genre_id = genres.id
    WHERE movie_genres.movie_id = ?
  `);

  return movies.map((m) => ({
    ...m,
    genres: genreStmt.all(m.id),
  }));
}

router.get('/', (req, res) => {
  const { genre, director, year, sort, page = 1, limit = 10 } = req.query;

  let sql = `
    SELECT 
      movies.id, movies.title, movies.director, movies.year,
      movies.country, movies.description, movies.posterUrl,
      movies.user_id, users.username AS createdBy, movies.createdAt
    FROM movies
    JOIN users ON movies.user_id = users.id
  `;

  const conditions = [];
  const params = [];

  if (genre) {
    sql += ' JOIN movie_genres ON movies.id = movie_genres.movie_id JOIN genres ON movie_genres.genre_id = genres.id';
    conditions.push('genres.name = ?');
    params.push(genre);
  }

  if (director) {
    conditions.push('movies.director LIKE ?');
    params.push(`%${director}%`);
  }

  if (year) {
    conditions.push('movies.year = ?');
    params.push(year);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  const sortMap = {
    year_asc: 'movies.year ASC',
    year_desc: 'movies.year DESC',
    title_asc: 'movies.title ASC',
    title_desc: 'movies.title DESC',
  };
  sql += ' ORDER BY ' + (sortMap[sort] || 'movies.id DESC');

  const offset = (Number(page) - 1) * Number(limit);
  sql += ' LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  const movies = db.prepare(sql).all(...params);

  res.json({
    count: movies.length,
    page: Number(page),
    limit: Number(limit),
    movies: attachGenres(movies),
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  const movie = db
    .prepare(
      `
      SELECT 
        movies.id, movies.title, movies.director, movies.year,
        movies.country, movies.description, movies.posterUrl,
        movies.user_id, users.username AS createdBy, movies.createdAt
      FROM movies
      JOIN users ON movies.user_id = users.id
      WHERE movies.id = ?
    `
    )
    .get(id);

  if (!movie) {
    return res.status(404).json({ message: 'Фильм не найден' });
  }

  const genres = db
    .prepare(
      'SELECT genres.id, genres.name FROM movie_genres JOIN genres ON movie_genres.genre_id = genres.id WHERE movie_genres.movie_id = ?'
    )
    .all(id);

  const reviews = db
    .prepare(
      `
      SELECT 
        reviews.id, reviews.rating, reviews.title, reviews.body, reviews.createdAt,
        users.username AS author,
        (SELECT COUNT(*) FROM likes WHERE likes.review_id = reviews.id) AS likesCount
      FROM reviews
      JOIN users ON reviews.user_id = users.id
      WHERE reviews.movie_id = ? AND reviews.status = 'approved'
      ORDER BY reviews.id DESC
    `
    )
    .all(id);

  res.json({ ...movie, genres, reviews });
});

router.post('/', auth, (req, res) => {
  const { title, director, year, country, description, posterUrl, genreIds } = req.body;

  if (!title || !director) {
    return res.status(400).json({ message: 'Поля title и director обязательны' });
  }

  const result = db
    .prepare(
      'INSERT INTO movies (title, director, year, country, description, posterUrl, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      title,
      director,
      year || null,
      country || null,
      description || null,
      posterUrl || null,
      req.user.id
    );

  const movieId = result.lastInsertRowid;

  if (Array.isArray(genreIds)) {
    const insertMG = db.prepare('INSERT OR IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)');
    genreIds.forEach((gId) => insertMG.run(movieId, gId));
  }

  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(movieId);

  res.status(201).json({ message: 'Фильм добавлен', movie });
});

router.put('/:id', auth, (req, res) => {
  const { id } = req.params;

  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
  if (!movie) {
    return res.status(404).json({ message: 'Фильм не найден' });
  }

  const isOwner = movie.user_id === req.user.id;
  const isPrivileged = ['admin', 'moderator'].includes(req.user.role);

  if (!isOwner && !isPrivileged) {
    return res.status(403).json({ message: 'Нет прав на редактирование фильма' });
  }

  const { title, director, year, country, description, posterUrl } = req.body;

  db.prepare(
    'UPDATE movies SET title = ?, director = ?, year = ?, country = ?, description = ?, posterUrl = ? WHERE id = ?'
  ).run(
    title ?? movie.title,
    director ?? movie.director,
    year ?? movie.year,
    country ?? movie.country,
    description ?? movie.description,
    posterUrl ?? movie.posterUrl,
    id
  );

  const updated = db.prepare('SELECT * FROM movies WHERE id = ?').get(id);

  res.json({ message: 'Фильм обновлён', movie: updated });
});

router.delete('/:id', auth, checkRole('admin', 'moderator'), (req, res) => {
  const { id } = req.params;

  const movie = db.prepare('SELECT id FROM movies WHERE id = ?').get(id);
  if (!movie) {
    return res.status(404).json({ message: 'Фильм не найден' });
  }

  db.prepare('DELETE FROM movies WHERE id = ?').run(id);

  res.json({ message: 'Фильм удалён' });
});

module.exports = router;
const express = require('express');
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

const router = express.Router({ mergeParams: true });

router.post('/', auth, (req, res) => {
  const { id: movieId } = req.params;
  const { rating, title, body } = req.body;

  const movie = db.prepare('SELECT id FROM movies WHERE id = ?').get(movieId);
  if (!movie) {
    return res.status(404).json({ message: 'Фильм не найден' });
  }

  if (!rating || rating < 1 || rating > 10) {
    return res.status(400).json({ message: 'Рейтинг должен быть от 1 до 10' });
  }

  if (!title || !body) {
    return res.status(400).json({ message: 'Поля title и body обязательны' });
  }

  const result = db
    .prepare(
      'INSERT INTO reviews (movie_id, user_id, rating, title, body, status) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(movieId, req.user.id, rating, title, body, 'pending');

  const review = db
    .prepare(
      `
      SELECT 
        reviews.id, reviews.movie_id, reviews.user_id, reviews.rating,
        reviews.title, reviews.body, reviews.status, reviews.createdAt,
        users.username AS author
      FROM reviews
      JOIN users ON reviews.user_id = users.id
      WHERE reviews.id = ?
    `
    )
    .get(result.lastInsertRowid);

  res.status(201).json({ message: 'Рецензия создана (на модерации)', review });
});

router.get('/', (req, res) => {
  const { id: movieId } = req.params;

  const movie = db.prepare('SELECT id FROM movies WHERE id = ?').get(movieId);
  if (!movie) {
    return res.status(404).json({ message: 'Фильм не найден' });
  }

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
    .all(movieId);

  res.json({ count: reviews.length, reviews });
});

router.delete('/:id', auth, (req, res) => {
  const { id } = req.params;

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
  if (!review) {
    return res.status(404).json({ message: 'Рецензия не найдена' });
  }

  const isOwner = review.user_id === req.user.id;
  const isPrivileged = ['admin', 'moderator'].includes(req.user.role);

  if (!isOwner && !isPrivileged) {
    return res.status(403).json({ message: 'Нет прав на удаление рецензии' });
  }

  db.prepare('DELETE FROM reviews WHERE id = ?').run(id);

  res.json({ message: 'Рецензия удалена' });
});

router.patch('/:id/status', auth, checkRole('admin', 'moderator'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Статус должен быть approved, rejected или pending' });
  }

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
  if (!review) {
    return res.status(404).json({ message: 'Рецензия не найдена' });
  }

  db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run(status, id);

  const updated = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);

  res.json({ message: `Статус изменён на "${status}"`, review: updated });
});

module.exports = router;
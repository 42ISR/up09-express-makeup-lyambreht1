const express = require('express');
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

router.get('/users', auth, checkRole('admin'), (req, res) => {
  const users = db
    .prepare('SELECT id, username, email, role, bio, createdAt FROM users ORDER BY id ASC')
    .all();

  res.json({ count: users.length, users });
});

router.patch('/users/:id/role', auth, checkRole('admin'), (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['user', 'moderator', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Роль должна быть user, moderator или admin' });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ message: 'Пользователь не найден' });
  }

  if (Number(id) === req.user.id && role !== 'admin') {
    return res.status(400).json({ message: 'Нельзя снять с себя роль администратора' });
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);

  const updated = db
    .prepare('SELECT id, username, email, role, bio, createdAt FROM users WHERE id = ?')
    .get(id);

  res.json({ message: `Роль изменена на "${role}"`, user: updated });
});

router.delete('/users/:id', auth, checkRole('admin'), (req, res) => {
  const { id } = req.params;

  if (Number(id) === req.user.id) {
    return res.status(400).json({ message: 'Нельзя удалить самого себя' });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ message: 'Пользователь не найден' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);

  res.json({ message: 'Пользователь удалён' });
});

router.get('/reviews/pending', auth, checkRole('admin', 'moderator'), (req, res) => {
  const reviews = db
    .prepare(
      `
      SELECT 
        reviews.id, reviews.movie_id, reviews.user_id, reviews.rating,
        reviews.title, reviews.body, reviews.status, reviews.createdAt,
        users.username AS author,
        movies.title AS movieTitle
      FROM reviews
      JOIN users ON reviews.user_id = users.id
      JOIN movies ON reviews.movie_id = movies.id
      WHERE reviews.status = 'pending'
      ORDER BY reviews.id ASC
    `
    )
    .all();

  res.json({ count: reviews.length, reviews });
});

module.exports = router;
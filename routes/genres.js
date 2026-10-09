const express = require('express');
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

router.get('/', (req, res) => {
  const genres = db.prepare('SELECT * FROM genres ORDER BY id ASC').all();
  res.json({ count: genres.length, genres });
});

router.post('/', auth, checkRole('admin', 'moderator'), (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Название жанра обязательно' });
  }

  const existing = db.prepare('SELECT id FROM genres WHERE name = ?').get(name.trim());
  if (existing) {
    return res.status(409).json({ message: 'Такой жанр уже существует' });
  }

  const result = db.prepare('INSERT INTO genres (name) VALUES (?)').run(name.trim());
  const genre = db.prepare('SELECT * FROM genres WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ message: 'Жанр создан', genre });
});

router.delete('/:id', auth, checkRole('admin'), (req, res) => {
  const { id } = req.params;

  const genre = db.prepare('SELECT id FROM genres WHERE id = ?').get(id);
  if (!genre) {
    return res.status(404).json({ message: 'Жанр не найден' });
  }

  db.prepare('DELETE FROM genres WHERE id = ?').run(id);

  res.json({ message: 'Жанр удалён' });
});

module.exports = router;
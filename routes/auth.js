const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { auth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { username, email, password, bio } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Все поля обязательны' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Пароль должен быть минимум 6 символов' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ message: 'Email уже занят' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const result = db
    .prepare('INSERT INTO users (username, email, password, role, bio) VALUES (?, ?, ?, ?, ?)')
    .run(username, email, passwordHash, 'user', bio || null);

  const token = jwt.sign({ id: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    message: 'Регистрация успешна',
    token,
    user: {
      id: result.lastInsertRowid,
      username,
      email,
      role: 'user',
      bio: bio || null,
    },
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email и пароль обязательны' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    return res.status(401).json({ message: 'Неверный email или пароль' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);

  if (!validPassword) {
    return res.status(401).json({ message: 'Неверный email или пароль' });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    message: 'Вход выполнен',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      bio: user.bio,
    },
  });
});

router.get('/profile', auth, (req, res) => {
  res.json({ user: req.user });
});

router.put('/profile', auth, (req, res) => {
  const { username, bio } = req.body;

  if (!username && bio === undefined) {
    return res.status(400).json({ message: 'Нужно передать хотя бы username или bio' });
  }

  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  db.prepare('UPDATE users SET username = ?, bio = ? WHERE id = ?').run(
    username ?? current.username,
    bio ?? current.bio,
    req.user.id
  );

  const updated = db
    .prepare('SELECT id, username, email, role, bio, createdAt FROM users WHERE id = ?')
    .get(req.user.id);

  res.json({ message: 'Профиль обновлён', user: updated });
});

module.exports = router;
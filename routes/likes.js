const express = require('express');
const db = require('../db/database');
const { auth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.post('/:id/like', auth, (req, res) => {
  const { id: reviewId } = req.params;

  const review = db.prepare('SELECT id FROM reviews WHERE id = ?').get(reviewId);
  if (!review) {
    return res.status(404).json({ message: 'Рецензия не найдена' });
  }

  const existing = db
    .prepare('SELECT id FROM likes WHERE review_id = ? AND user_id = ?')
    .get(reviewId, req.user.id);

  if (existing) {
    return res.status(409).json({ message: 'Вы уже поставили лайк этой рецензии' });
  }

  const result = db
    .prepare('INSERT INTO likes (review_id, user_id) VALUES (?, ?)')
    .run(reviewId, req.user.id);

  const likesCount = db
    .prepare('SELECT COUNT(*) AS count FROM likes WHERE review_id = ?')
    .get(reviewId).count;

  res.status(201).json({
    message: 'Лайк поставлен',
    likeId: result.lastInsertRowid,
    likesCount,
  });
});

router.delete('/:id/like', auth, (req, res) => {
  const { id: reviewId } = req.params;

  const existing = db
    .prepare('SELECT id FROM likes WHERE review_id = ? AND user_id = ?')
    .get(reviewId, req.user.id);

  if (!existing) {
    return res.status(404).json({ message: 'Лайк не найден' });
  }

  db.prepare('DELETE FROM likes WHERE review_id = ? AND user_id = ?').run(reviewId, req.user.id);

  const likesCount = db
    .prepare('SELECT COUNT(*) AS count FROM likes WHERE review_id = ?')
    .get(reviewId).count;

  res.json({ message: 'Лайк убран', likesCount });
});

module.exports = router;
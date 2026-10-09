require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRouter = require('./routes/auth');
const moviesRouter = require('./routes/movies');
const genresRouter = require('./routes/genres');
const reviewsRouter = require('./routes/reviews');
const likesRouter = require('./routes/likes');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Movie Reviews API is running' });
});

app.use('/api/auth', authRouter);
app.use('/api/movies', moviesRouter);
app.use('/api/genres', genresRouter);
app.use('/api/movies/:id/reviews', reviewsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/reviews', likesRouter);
app.use('/api/admin', adminRouter);

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
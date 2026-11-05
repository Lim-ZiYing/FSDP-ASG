require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/stalls', require('./routes/stalls'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/orders', require('./routes/orders'));

// Anything not matched above
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Errors thrown in any route end up here
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.publicMessage || 'Something went wrong' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));

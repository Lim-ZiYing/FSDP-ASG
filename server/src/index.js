require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Every area already has its route file. Fill in your own file;
// you shouldn't need to change this list.
app.use('/api/auth', require('./routes/auth'));         // Zi Ying
app.use('/api/hawker', require('./routes/hawker'));     // Zi Ying
app.use('/api/track', require('./routes/tracking'));    // Zi Ying
app.use('/api/stalls', require('./routes/stalls'));     // Siyu
app.use('/api/votes', require('./routes/votes'));       // Siyu
app.use('/api/orders', require('./routes/orders'));     // Lennox
app.use('/api/payments', require('./routes/payments')); // Declan
app.use('/api/photos', require('./routes/photos'));     // Dana

// Anything not matched above
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Errors thrown in any route end up here
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Try again.' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));

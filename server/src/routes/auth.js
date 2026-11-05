const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../db');

const router = express.Router();

function makeToken(user) {
  return jwt.sign({ userId: user.UserId, role: user.Role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register  { name, email, password }
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const hash = await bcrypt.hash(password, 10);
    const pool = await getPool();
    const result = await pool.request()
      .input('name', sql.NVarChar(100), name)
      .input('email', sql.NVarChar(255), email.toLowerCase())
      .input('hash', sql.NVarChar(255), hash)
      .query(`INSERT INTO Users (Name, Email, PasswordHash)
              OUTPUT INSERTED.UserId, INSERTED.Name, INSERTED.Role
              VALUES (@name, @email, @hash)`);

    const user = result.recordset[0];
    res.status(201).json({ token: makeToken(user), user: { id: user.UserId, name: user.Name, role: user.Role } });
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ error: 'That email is already registered' });
    next(err);
  }
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar(255), email.toLowerCase())
      .query('SELECT UserId, Name, Role, PasswordHash FROM Users WHERE Email = @email');

    const user = result.recordset[0];
    if (!user || !(await bcrypt.compare(password, user.PasswordHash))) {
      return res.status(401).json({ error: 'Wrong email or password' });
    }
    res.json({ token: makeToken(user), user: { id: user.UserId, name: user.Name, role: user.Role } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

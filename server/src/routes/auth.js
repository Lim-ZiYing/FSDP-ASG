const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const SAFE_FIELDS = 'id, display_name, email, role, language, points'; // never includes password_hash

// Shape a database row into what the React app receives
function toPublicUser(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    language: row.language,
    points: row.points,
  };
}

function makeToken(row) {
  return jwt.sign({ userId: row.id, role: row.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register   (FSDP-9 sign up)
// Body: { displayName, email, password }
// New accounts are always 'customer'. Hawker accounts are set up separately,
// so nobody can make themselves a hawker by editing the request.
router.post('/register', async (req, res, next) => {
  try {
    const displayName = String(req.body.displayName || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!displayName || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (displayName.length > 50) {
      return res.status(400).json({ error: 'Name must be 50 characters or fewer' });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: crypto.randomUUID(),
        display_name: displayName,
        email,
        password_hash: passwordHash,
      })
      .select(SAFE_FIELDS)
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'That email is already registered' });
      }
      throw error;
    }

    res.status(201).json({ token: makeToken(data), user: toPublicUser(data) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login   (FSDP-35 log in)
// Body: { email, password }
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select(`${SAFE_FIELDS}, password_hash`)
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;

    // Same message whether the email or the password is wrong,
    // so attackers can't find out which emails are registered.
    const passwordOk = user && user.password_hash && (await bcrypt.compare(password, user.password_hash));
    if (!passwordOk) {
      return res.status(401).json({ error: 'Wrong email or password' });
    }

    res.json({ token: makeToken(user), user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  – who is logged in (used when the app reloads)
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(SAFE_FIELDS)
      .eq('id', req.user.userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(401).json({ error: 'Account not found. Log in again.' });
    res.json({ user: toPublicUser(data) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout   (FSDP-10 log out)
// JWTs are stateless: logging out means the app deletes its saved token.
// This endpoint exists so the front end has one clear place to call.
router.post('/logout', (req, res) => {
  res.status(204).end();
});

module.exports = router;

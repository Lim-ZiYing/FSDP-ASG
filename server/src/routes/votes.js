// Owner: Siyu – upvoting
// Mounted at /api/votes. One vote per user per photo (FSDP-22).
// The database also enforces this: votes has a primary key on (user_id, photo_id),
// and a trigger blocks voting for your own photo.
//
// Both endpoints answer with the same shape the screens already use (see mocks.js):
//   { voted: true | false, votes: <number of votes on the photo now> }
const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function parseId(raw) {
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

// Number of votes a photo has right now
async function countVotes(photoId) {
  const { count, error } = await supabase
    .from('votes')
    .select('photo_id', { count: 'exact', head: true })
    .eq('photo_id', photoId);
  if (error) throw error;
  return count || 0;
}

// The photo, or null if it doesn't exist
async function findPhoto(photoId) {
  const { data, error } = await supabase
    .from('photos')
    .select('id, user_id, status')
    .eq('id', photoId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// POST /api/votes/:photoId   upvote a photo (FSDP-22)
router.post('/:photoId', requireAuth, async (req, res, next) => {
  try {
    const photoId = parseId(req.params.photoId);
    if (photoId === null) return res.status(404).json({ error: 'Photo not found' });

    // Only approved photos can be voted on
    const photo = await findPhoto(photoId);
    if (!photo || photo.status !== 'approved') return res.status(404).json({ error: 'Photo not found' });

    if (photo.user_id === req.user.userId) {
      return res.status(403).json({ error: 'You cannot vote for your own photo' });
    }

    const { error } = await supabase
      .from('votes')
      .insert({ user_id: req.user.userId, photo_id: photoId });

    if (error) {
      // 23505 = primary key clash: this user already voted for this photo
      if (error.code === '23505') return res.status(409).json({ error: 'You already voted for this photo' });
      // 23503 = the user in the token no longer exists
      if (error.code === '23503') return res.status(401).json({ error: 'Please log in again' });
      // The database trigger that blocks voting for your own photo
      if (/own photo/i.test(error.message || '')) return res.status(403).json({ error: 'You cannot vote for your own photo' });
      throw error;
    }

    res.status(201).json({ voted: true, votes: await countVotes(photoId) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/votes/:photoId   take my vote back (FSDP-22)
// Safe to call twice: if there is no vote to remove, it still answers { voted: false, votes }.
router.delete('/:photoId', requireAuth, async (req, res, next) => {
  try {
    const photoId = parseId(req.params.photoId);
    if (photoId === null) return res.status(404).json({ error: 'Photo not found' });

    const photo = await findPhoto(photoId);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    const { error } = await supabase
      .from('votes')
      .delete()
      .eq('user_id', req.user.userId)
      .eq('photo_id', photoId);
    if (error) throw error;

    res.json({ voted: false, votes: await countVotes(photoId) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

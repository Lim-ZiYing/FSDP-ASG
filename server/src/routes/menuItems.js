// Owner: Siyu – one dish for the dish page
// Mounted at /api/menu-items. Returns the SAME shape as getDish in client/src/mocks.js.
const express = require('express');
const { supabase } = require('../supabase');
const { getTopPhotoVotes } = require('../services/topPhotos');

const router = express.Router();

// GET /api/menu-items/:id      one dish + its stall (FSDP-12 / FSDP-34)   → mocks.js getDish
//     returns { id, stallId, name, description, priceCents, category, prepMinutes, isAvailable,
//               photoUrl, topPhotoId, topPhotoVotes,
//               stall: { id, name, unitNo, isOpen, estimatedMinutes } }
router.get('/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Dish not found' });
    const id = Number(req.params.id);

    // The dish, with the picture to show (top photo, or the stall's default photo)
    const { data: dish, error } = await supabase
      .from('menu_with_photo')
      .select('id, stall_id, name, description, price_cents, category, prep_minutes, is_available, photo_url, top_photo_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!dish) return res.status(404).json({ error: 'Dish not found' });

    // Its stall, and how long the queue is right now
    const [{ data: stall, error: stallError }, { data: queue, error: queueError }, votes] = await Promise.all([
      supabase.from('stalls').select('id, name, unit_no, is_open, is_paused').eq('id', dish.stall_id).maybeSingle(),
      supabase.from('stall_queue').select('est_wait_minutes').eq('stall_id', dish.stall_id).maybeSingle(),
      getTopPhotoVotes([dish.id]),
    ]);
    if (stallError) throw stallError;
    if (queueError) throw queueError;
    if (!stall) return res.status(404).json({ error: 'Dish not found' });

    res.json({
      id: dish.id,
      stallId: dish.stall_id,
      name: dish.name,
      description: dish.description,
      priceCents: dish.price_cents,
      category: dish.category,
      prepMinutes: dish.prep_minutes,
      isAvailable: dish.is_available,
      photoUrl: dish.photo_url,
      topPhotoId: dish.top_photo_id,
      topPhotoVotes: votes.get(dish.id) || 0,
      stall: {
        id: stall.id,
        name: stall.name,
        unitNo: stall.unit_no,
        isOpen: stall.is_open && !stall.is_paused,
        estimatedMinutes: queue ? queue.est_wait_minutes : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
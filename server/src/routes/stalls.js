// Owner: Siyu – stall browsing and eMenu
// Mounted at /api/stalls
const express = require('express');
const { supabase } = require('../supabase');
const { notBuilt } = require('../notBuilt');
const { getMenuWithPhotos } = require('../services/topPhotos');

const router = express.Router();

function parseId(raw) {
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

function toStall(s, queue) {
  const q = queue.get(s.id);
  return {
    id: s.id,
    name: s.name,
    cuisine: s.cuisine,
    unitNo: s.unit_no,
    photoUrl: s.default_photo_url,
    acceptsCdc: s.accepts_cdc,
    isOpen: s.is_open && !s.is_paused,
    ordersAhead: q ? q.orders_ahead : 0,
    estimatedMinutes: q ? q.est_wait_minutes : 0,
  };
}

async function getQueueMap() {
  const { data, error } = await supabase
    .from('stall_queue')
    .select('stall_id, orders_ahead, est_wait_minutes');
  if (error) throw error;
  return new Map(data.map((r) => [r.stall_id, r]));
}

const STALL_COLUMNS = 'id, name, cuisine, unit_no, default_photo_url, accepts_cdc, is_open, is_paused';

// GET /api/stalls  (FSDP-11) open stalls first, then shortest queue, then A to Z
router.get('/', async (req, res, next) => {
  try {
    const [{ data: stalls, error }, queue] = await Promise.all([
      supabase.from('stalls').select(STALL_COLUMNS),
      getQueueMap(),
    ]);
    if (error) throw error;

    const list = stalls.map((s) => toStall(s, queue));
    list.sort((a, b) =>
      Number(b.isOpen) - Number(a.isOpen) ||
      a.estimatedMinutes - b.estimatedMinutes ||
      a.name.localeCompare(b.name));
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/stalls/search?q=  (FSDP-41, Sprint 3) keep ABOVE '/:id'
router.get('/search', notBuilt('FSDP-41'));

// GET /api/stalls/:id  one stall, for the eMenu header (FSDP-12)
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(404).json({ error: 'Stall not found' });

    const { data: stall, error } = await supabase
      .from('stalls').select(STALL_COLUMNS).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!stall) return res.status(404).json({ error: 'Stall not found' });

    res.json(toStall(stall, await getQueueMap()));
  } catch (err) {
    next(err);
  }
});

// GET /api/stalls/:id/menu  (FSDP-12, FSDP-24) dishes with their top-voted photo
router.get('/:id/menu', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(404).json({ error: 'Stall not found' });
    res.json(await getMenuWithPhotos(id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;

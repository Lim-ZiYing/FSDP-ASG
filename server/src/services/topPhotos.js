// Owner: Dana – FSDP-23 Top-voted photo becomes the eMenu picture.
//
// The rule lives in the database (database/03_extras.sql):
//   top_photos       one row per dish: the approved photo with the most votes,
//                    earliest upload wins a tie
//   menu_with_photo  every dish with photo_url = top photo, or the stall's
//                    default photo when the dish has no approved uploads (FSDP-24)
//
// Siyu: GET /api/stalls/:id/menu can just call getMenuWithPhotos(stallId).
const { supabase } = require('../supabase');

// Every dish in a stall, with the picture the eMenu should show.
async function getMenuWithPhotos(stallId) {
  const { data: items, error } = await supabase
    .from('menu_with_photo')
    .select('id, stall_id, name, description, price_cents, category, prep_minutes, is_available, photo_url, top_photo_id')
    .eq('stall_id', stallId)
    .order('name');
  if (error) throw error;

  const votes = await getTopPhotoVotes(items.map((i) => i.id));

  return items.map((i) => ({
    id: i.id,
    stallId: i.stall_id,
    name: i.name,
    description: i.description,
    priceCents: i.price_cents,
    category: i.category,
    prepMinutes: i.prep_minutes,
    isAvailable: i.is_available,
    photoUrl: i.photo_url,                       // null if no uploads and no stall default
    topPhotoId: i.top_photo_id,                  // null when showing the stall's default photo
    topPhotoVotes: votes.get(i.id) || 0,
  }));
}

// Map of item_id -> votes on that dish's top photo
async function getTopPhotoVotes(itemIds) {
  const votes = new Map();
  if (itemIds.length === 0) return votes;

  const { data, error } = await supabase
    .from('top_photos')
    .select('item_id, vote_count')
    .in('item_id', itemIds);
  if (error) throw error;

  for (const row of data) votes.set(row.item_id, row.vote_count);
  return votes;
}

// The top photo for one dish, or null if it has no approved uploads.
async function getTopPhoto(itemId) {
  const { data, error } = await supabase
    .from('top_photos')
    .select('photo_id, item_id, image_url, vote_count')
    .eq('item_id', itemId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.photo_id, itemId: data.item_id, url: data.image_url, votes: data.vote_count };
}

module.exports = { getMenuWithPhotos, getTopPhoto, getTopPhotoVotes };

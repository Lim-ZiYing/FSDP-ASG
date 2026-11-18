// Owners: Siyu – centres and top dishes · Lennox – collection points
// Mounted at /api/centres. Each route must return the SAME shape as its function in client/src/mocks.js.
// When yours works, delete its name from NOT_READY in client/src/api.js.
const express = require("express");
const { supabase } = require("../supabase");
const { notBuilt } = require("../notBuilt");

const router = express.Router();

// GET /api/centres                          hawker centres for the picker (FSDP-68)   → mocks.js getCentres
//     returns [{ id, name, address }]
router.get("/", notBuilt("FSDP-68"));

// GET /api/centres/:id/top-dishes           most-voted dishes at a centre, for Home   → mocks.js getTopDishes
//     returns [{ itemId, name, stallId, stallName, priceCents, photoUrl, votes }]  (most votes first, max 6)
router.get("/:id/top-dishes", notBuilt("FSDP-22"));

// GET /api/centres/:id/collection-points    where customers collect food (FSDP-30)   → mocks.js getCollectionPoints
//     returns [{ id, name, note }]
// GET /api/centres/:centreId/collection-points   -> [{ id, name, note }]   (Lennox)
router.get("/:centreId/collection-points", async (req, res) => {
  const { data, error } = await supabase
    .from("collection_points")
    .select("id, name, note")
    .eq("centre_id", Number(req.params.centreId));
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;

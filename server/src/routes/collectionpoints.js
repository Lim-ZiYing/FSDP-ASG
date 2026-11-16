// Owner: Lennox – FSDP collection points for a hawker centre
const express = require("express");
const { supabase } = require("../supabase");

const router = express.Router();

// GET /api/centres/:centreId/collection-points   -> [{ id, name, note }]
router.get("/:centreId/collection-points", async (req, res) => {
  const { data, error } = await supabase
    .from("collection_points")
    .select("id, name, note")
    .eq("centre_id", Number(req.params.centreId));
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;

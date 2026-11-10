// Placeholder handler for endpoints that aren't built yet.
// Replace each notBuilt(...) with your real handler when you build that story.
function notBuilt(story) {
  return (req, res) => res.status(501).json({ error: `Not built yet (${story})` });
}

module.exports = { notBuilt };

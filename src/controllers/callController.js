const Call = require('../models/Call');

/**
 * GET /api/calls?page=1&limit=30
 * Call history for the logged-in user (as caller or receiver)
 */
async function getCallHistory(req, res) {
  try {
    const me = req.user._id;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 30);

    const calls = await Call.find({ $or: [{ caller: me }, { receiver: me }] })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('caller', 'name phone photo')
      .populate('receiver', 'name phone photo');

    return res.status(200).json({ calls, page, limit });
  } catch (err) {
    console.error('[getCallHistory]', err);
    return res.status(500).json({ message: 'Failed to fetch call history' });
  }
}

/**
 * DELETE /api/calls/:id
 */
async function deleteCallRecord(req, res) {
  try {
    const { id } = req.params;
    await Call.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Call record deleted' });
  } catch (err) {
    console.error('[deleteCallRecord]', err);
    return res.status(500).json({ message: 'Failed to delete call record' });
  }
}

module.exports = { getCallHistory, deleteCallRecord };

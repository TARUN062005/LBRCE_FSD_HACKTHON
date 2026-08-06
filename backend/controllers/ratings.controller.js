const Rating = require('../models/Rating')
const Site = require('../models/Site')
const Booking = require('../models/Booking')

async function listRatings(req, res) {
  try {
    const siteId = req.params.siteId || req.query.siteId
    if (!siteId) {
      return res.status(400).json({ status: 'error', message: 'siteId required' })
    }
    const ratings = await Rating.find({ siteId }).sort({ createdAt: -1 }).limit(50)
    return res.json({ status: 'ok', data: ratings.map((r) => r.toSafeJSON()) })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to list ratings' })
  }
}

async function createRating(req, res) {
  try {
    const { siteId, rating, comment, bookingId } = req.body || {}
    const value = Number(rating)
    if (!siteId || !Number.isFinite(value) || value < 1 || value > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'siteId and rating (1–5) are required',
      })
    }

    const site = await Site.findById(siteId)
    if (!site) {
      return res.status(404).json({ status: 'error', message: 'Station not found' })
    }

    if (bookingId) {
      const booking = await Booking.findById(bookingId)
      if (!booking || booking.userId.toString() !== req.user.userId) {
        return res.status(400).json({ status: 'error', message: 'Invalid booking' })
      }
    }

    const doc = await Rating.findOneAndUpdate(
      { userId: req.user.userId, siteId },
      {
        userId: req.user.userId,
        siteId,
        bookingId: bookingId || null,
        rating: value,
        comment: String(comment || '').slice(0, 500),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    const agg = await Rating.aggregate([
      { $match: { siteId: site._id } },
      { $group: { _id: '$siteId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ])
    if (agg[0]) {
      site.ratingAvg = Number(agg[0].avg.toFixed(2))
      site.ratingCount = agg[0].count
      await site.save()
    }

    return res.status(201).json({ status: 'ok', data: doc.toSafeJSON(), station: site.toSafeJSON() })
  } catch (err) {
    console.error('[ratings] create:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to save rating' })
  }
}

module.exports = { listRatings, createRating }

function getHealth(_req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'API healthy',
    timestamp: new Date().toISOString(),
  })
}

module.exports = { getHealth }

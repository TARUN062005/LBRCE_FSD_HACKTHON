const express = require('express')
const {
  listSites,
  getSite,
  createSite,
  updateSite,
  updateSiteLimit,
  deleteSite,
} = require('../controllers/sites.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.use(verifyToken, requireRole('admin'))

router.get('/', listSites)
router.post('/', createSite)
router.get('/:id', getSite)
router.patch('/:id', updateSite)
router.patch('/:id/limit', updateSiteLimit)
router.delete('/:id', deleteSite)

module.exports = router

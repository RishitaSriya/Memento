const express = require('express');
const router = express.Router();
const memoryController = require('../controllers/memoryController');

router.get('/rewind', memoryController.getRewind);
router.get('/recap-30-days', memoryController.getRecap30Days);

module.exports = router;

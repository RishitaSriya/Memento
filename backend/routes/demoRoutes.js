const express = require('express');
const router = express.Router();
const demoController = require('../controllers/demoController');

router.post('/import', demoController.importDemo);
router.post('/reset', demoController.resetDemo);
router.get('/status', demoController.getDemoStatus);

module.exports = router;

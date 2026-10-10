const express = require('express');
const router = express.Router();
const detectiveController = require('../controllers/detectiveController');

router.get('/analysis', detectiveController.getDetectiveAnalysis);

module.exports = router;

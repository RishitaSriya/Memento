const express = require('express');
const router = express.Router();
const capsuleController = require('../controllers/capsuleController');

router.get('/', capsuleController.getCapsules);
router.post('/', capsuleController.createCapsule);
router.get('/:id', capsuleController.getCapsule);
router.put('/:id', capsuleController.updateCapsule);
router.delete('/:id', capsuleController.deleteCapsule);

module.exports = router;

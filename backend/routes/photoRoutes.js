const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const { upload } = require('../middleware/upload');

// Stats & special routes
router.get('/stats', photoController.getStats);
router.get('/on-this-day', photoController.getOnThisDay);
router.get('/timeline', photoController.getTimeline);
router.get('/ai-search', photoController.aiSearchPhotos);
router.post('/analyze-all', photoController.analyzeAllPhotos);

// CRUD
router.get('/', photoController.getPhotos);
router.post('/upload', upload.array('photos', 20), photoController.uploadPhotos);
router.post('/:id/analyze', photoController.analyzePhoto);
router.get('/:id', photoController.getPhoto);
router.put('/:id', photoController.updatePhoto);
router.patch('/:id/favorite', photoController.toggleFavorite);
router.delete('/bulk', photoController.deletePhotos);
router.delete('/:id', photoController.deletePhoto);

module.exports = router;

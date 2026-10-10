const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');

router.get('/', albumController.getAlbums);
router.post('/', albumController.createAlbum);
router.get('/:id', albumController.getAlbum);
router.put('/:id', albumController.updateAlbum);
router.delete('/:id', albumController.deleteAlbum);
router.post('/:id/photos', albumController.addPhotosToAlbum);
router.delete('/:id/photos', albumController.removePhotosFromAlbum);
router.post('/move', albumController.movePhotos);

module.exports = router;

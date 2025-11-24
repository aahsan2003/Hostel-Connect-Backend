const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const {
    addFavorite,
    removeFavorite,
    getUserFavorites,
    checkFavorite
} = require('../controllers/favoriteController');


router.post('/favorite', requireAuth, addFavorite);


router.delete('/favorite/:productId', requireAuth, removeFavorite);


router.get('/favorite', requireAuth, getUserFavorites);


router.get('/favorite/check/:productId', requireAuth, checkFavorite);

module.exports = router;


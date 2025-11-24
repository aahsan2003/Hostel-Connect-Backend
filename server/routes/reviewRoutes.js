const express = require('express');
const { getReviews, createReview, updateReview, deleteReview } = require('../controllers/reviewController');
const requireAuth = require('../middleware/requireAuth');
const router = express.Router();


router.post('/review/:productId', requireAuth, createReview);


router.get('/review/:productId', getReviews);


router.put('/review/:id', requireAuth, updateReview);


router.delete('/review/:id', requireAuth, deleteReview);

module.exports = router;


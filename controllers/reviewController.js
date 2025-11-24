const mongoose = require('mongoose');
const Review = require('../models/Review');
const Hostel = require('../models/Hostel');

const createReview = async (req, res, next) => {
    try {
        const { rating, comment } = req.body;
        const { productId } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            const error = new Error('Invalid product ID');
            error.status = 400;
            return next(error);
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            const error = new Error('Rating must be an integer between 1 and 5');
            error.status = 400;
            return next(error);
        }

        
        const product = await Hostel.findById(productId);
        if (!product) {
            const error = new Error('Hostel not found');
            error.status = 404;
            return next(error);
        }

        
        const existingReview = await Review.findOne({ user: userId, product: productId });
        if (existingReview) {
            const error = new Error('You have already reviewed this product. Use update to modify your review.');
            error.status = 409;
            return next(error);
        }

        const review = new Review({
            user: userId,
            product: productId,
            comment: comment || '',
            rating
        });

        await review.save();
        await review.populate('user', 'username fullName email');

        res.status(201).json({
            message: 'Review created successfully',
            review
        });
    } catch (error) {
        
        if (error.code === 11000) {
            const err = new Error('You have already reviewed this product. Use update to modify your review.');
            err.status = 409;
            return next(err);
        }
        next(error);
    }
};

const updateReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error('Invalid review ID');
            error.status = 400;
            return next(error);
        }

        if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
            const error = new Error('Rating must be an integer between 1 and 5');
            error.status = 400;
            return next(error);
        }

        const updateData = {};
        if (rating !== undefined) updateData.rating = rating;
        if (comment !== undefined) updateData.comment = comment;

        const review = await Review.findOneAndUpdate(
            {
                _id: id,
                user: userId
            },
            { $set: updateData },
            { new: true }
        ).populate('user', 'username fullName email');

        if (!review) {
            const error = new Error('Review not found or you are not authorized to update it');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({
            message: 'Review updated successfully',
            review
        });
    } catch (error) {
        next(error);
    }
};

const getReviews = async (req, res, next) => {
    try {
        const { productId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            const error = new Error('Invalid product ID');
            error.status = 400;
            return next(error);
        }

        const reviews = await Review.find({ product: productId })
            .populate('user', 'username fullName email')
            .sort({ createdAt: -1 });

        res.status(200).json({ reviews });
    } catch (error) {
        next(error);
    }
};

const deleteReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error('Invalid review ID');
            error.status = 400;
            return next(error);
        }

        const review = await Review.findOneAndDelete({
            _id: id,
            user: userId
        });

        if (!review) {
            const error = new Error('Review not found or you are not authorized to delete it');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({
            message: 'Review deleted successfully',
            review
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createReview,
    updateReview,
    getReviews,
    deleteReview
};


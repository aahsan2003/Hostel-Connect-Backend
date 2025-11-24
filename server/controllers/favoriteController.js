const Favorite = require('../models/Favorite');
const Hostel = require('../models/Hostel');
const mongoose = require('mongoose');


const addFavorite = async (req, res, next) => {
    try {
        const { productId } = req.body;

        if (!productId) {
            const error = new Error('Hostel ID is required');
            error.status = 400;
            return next(error);
        }

        
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            const error = new Error('Invalid product ID');
            error.status = 400;
            return next(error);
        }

        
        const product = await Hostel.findById(productId);
        if (!product) {
            const error = new Error('Hostel not found');
            error.status = 404;
            return next(error);
        }

        const userId = req.user._id;

        
        const existingFavorite = await Favorite.findOne({ user: userId, product: productId });
        if (existingFavorite) {
            return res.status(200).json({
                message: 'Hostel already in favorites',
                favorite: existingFavorite
            });
        }

        
        const favorite = new Favorite({
            user: userId,
            product: productId
        });

        await favorite.save();

        
        await favorite.populate('product', 'name price images category listingType status');

        res.status(201).json({
            message: 'Hostel added to favorites',
            favorite
        });
    } catch (error) {
        
        if (error.code === 11000) {
            return res.status(200).json({
                message: 'Hostel already in favorites'
            });
        }
        next(error);
    }
};


const removeFavorite = async (req, res, next) => {
    try {
        const { productId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            const error = new Error('Invalid product ID');
            error.status = 400;
            return next(error);
        }

        const userId = req.user._id;

        const favorite = await Favorite.findOneAndDelete({ user: userId, product: productId });

        if (!favorite) {
            const error = new Error('Favorite not found');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({
            message: 'Hostel removed from favorites'
        });
    } catch (error) {
        next(error);
    }
};


const getUserFavorites = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const favorites = await Favorite.find({ user: userId })
            .populate('product', 'name price images category listingType status owner')
            .populate('product.owner', 'username email fullName')
            .sort({ createdAt: -1 });

        res.status(200).json({ favorites });
    } catch (error) {
        next(error);
    }
};


const checkFavorite = async (req, res, next) => {
    try {
        const { productId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            const error = new Error('Invalid product ID');
            error.status = 400;
            return next(error);
        }

        const userId = req.user._id;

        const favorite = await Favorite.findOne({ user: userId, product: productId });

        res.status(200).json({
            isFavorited: !!favorite
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addFavorite,
    removeFavorite,
    getUserFavorites,
    checkFavorite
};


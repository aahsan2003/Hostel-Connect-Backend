const express = require('express')
const Hostel = require('../models/Hostel')
const mongoose = require('mongoose')
const upload = require('../middleware/upload')
const { requireRole } = require('../middleware/requireRole')
const requireAuth = require('../middleware/requireAuth')
const router = express.Router()


const calculateAverageRating = (ratings) => {
    if (!ratings || ratings.length === 0) return 0
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
    return (sum / ratings.length).toFixed(1)
}


const addRatingInfo = (hostel) => {
    const hostelObj = hostel.toObject ? hostel.toObject() : hostel
    const ratings = hostelObj.ratings || hostel.ratings || []
    const avgRating = calculateAverageRating(ratings)
    const ratingCount = ratings.length

    return {
        ...hostelObj,
        ratings: ratings,
        averageRating: parseFloat(avgRating),
        ratingCount: ratingCount
    }
}


router.get('/hostels', async (req, res, next) => {
    try {
        const hostels = await Hostel.find({ status: 'Approved' })
            .populate('owner', 'username')
            .populate('ratings.user', 'username')

        const hostelsWithRatings = hostels.map(addRatingInfo)
            .sort((a, b) => b.averageRating - a.averageRating)

        res.status(200).json(hostelsWithRatings)
    } catch (error) {
        next(error)
    }
})


router.get('/hostels/my-hostels', requireAuth, requireRole('HostelOwner'), async (req, res, next) => {
    try {
        const hostels = await Hostel.find({ owner: req.user._id }).populate('owner', 'username')
        res.status(200).json(hostels)
    } catch (error) {
        next(error)
    }
})


router.get('/hostels/admin/all', requireAuth, requireRole('admin'), async (req, res, next) => {
    try {
        const hostels = await Hostel.find().populate('owner', 'username email')
        res.status(200).json(hostels)
    } catch (error) {
        next(error)
    }
})


router.get('/hostels/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error("Invalid hostel id")
            error.status = 400
            return next(error)
        }

        const hostel = await Hostel.findById(id)
            .populate('owner', 'username email')
            .populate('ratings.user', 'username fullName')

        if (!hostel) {
            const error = new Error("Hostel Not Found")
            error.status = 404
            return next(error)
        }

        const hostelWithRating = addRatingInfo(hostel)
        res.status(200).json(hostelWithRating)
    } catch (error) {
        next(error)
    }
})


router.delete('/hostels/:id', requireAuth, requireRole('HostelOwner'), async (req, res, next) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error("Invalid hostel id")
            error.status = 400
            return next(error)
        }

        const hostel = await Hostel.findById(id)
        if (!hostel) {
            const error = new Error("Hostel Not Found")
            error.status = 404
            return next(error)
        }

        if (hostel.owner.toString() !== req.user._id.toString()) {
            const error = new Error("You can only delete your own hostels")
            error.status = 403
            return next(error)
        }

        const deleteHostel = await Hostel.findByIdAndDelete(id)
        res.status(200).json({ message: 'Hostel Deleted Successfully', deleteHostel })
    } catch (error) {
        next(error)
    }
})


router.post('/hostels', requireAuth, requireRole('HostelOwner'), upload.array('hostelImages', 4), async (req, res, next) => {
    try {
        const { name, location, type, price, description, phone, amenities } = req.body

        if (!name || !location || !type || !price || !description || !phone) {
            const error = new Error('All fields are required')
            error.status = 400
            return next(error)
        }

        const priceNum = parseFloat(price)
        if (isNaN(priceNum) || priceNum <= 0) {
            const error = new Error('Price must be a valid positive number')
            error.status = 400
            return next(error)
        }

        if (!req.files || req.files.length === 0) {
            const error = new Error('Hostel Image Required')
            error.status = 400
            return next(error)
        }

        
        console.log('Uploaded files:', req.files.map(f => ({ filename: f.filename, path: f.path })));

        const newHostel = new Hostel({
            name: name.trim(),
            location: location.trim(),
            type,
            price: priceNum,
            description: description.trim(),
            phone,
            amenities: amenities ? (Array.isArray(amenities) ? amenities : JSON.parse(amenities)) : [],
            images: req.files.map(file => file.path), 
            owner: req.user._id,
            status: 'Pending'
        })

        console.log('Attempting to save hostel:', newHostel);
        const savedHostel = await newHostel.save()
        console.log('Hostel saved successfully with ID:', savedHostel._id);

        res.status(201).json({ message: 'Hostel Submitted for Approval', hostel: savedHostel })
    } catch (error) {
        console.error('Error saving hostel:', error);
        next(error)
    }
})


router.put("/hostels/approve/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error("Invalid hostel id")
            error.status = 400
            return next(error)
        }

        const hostel = await Hostel.findByIdAndUpdate(
            id,
            { status: "Approved" },
            { new: true }
        );

        if (!hostel) {
            const error = new Error("Hostel Not Found")
            error.status = 404
            return next(error)
        }

        res.status(200).json({ message: "Hostel approved", hostel });
    } catch (error) {
        next(error)
    }
});


router.put("/hostels/reject/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error("Invalid hostel id")
            error.status = 400
            return next(error)
        }

        const hostel = await Hostel.findByIdAndUpdate(
            id,
            { status: "Rejected" },
            { new: true }
        );

        if (!hostel) {
            const error = new Error("Hostel Not Found")
            error.status = 404
            return next(error)
        }

        res.status(200).json({ message: "Hostel rejected", hostel });
    } catch (error) {
        next(error)
    }
});


router.put('/hostels/:id', requireAuth, requireRole('HostelOwner'), upload.array('hostelImages', 4), async (req, res, next) => {
    try {
        const { id } = req.params
        const { name, location, type, price, description, phone, amenities } = req.body

        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error("Invalid hostel id")
            error.status = 400
            return next(error)
        }

        const hostel = await Hostel.findById(id)
        if (!hostel) {
            const error = new Error("Hostel Not Found")
            error.status = 404
            return next(error)
        }

        if (hostel.owner.toString() !== req.user._id.toString()) {
            const error = new Error("You can only update your own hostels")
            error.status = 403
            return next(error)
        }

        if (name) hostel.name = name
        if (location) hostel.location = location
        if (type) hostel.type = type
        if (price) hostel.price = parseFloat(price)
        if (description) hostel.description = description
        if (phone) hostel.phone = phone
        if (amenities) hostel.amenities = Array.isArray(amenities) ? amenities : JSON.parse(amenities)

        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => file.path)
            hostel.images = newImages
        }

        hostel.status = 'Pending'
        await hostel.save()

        const updatedHostel = await Hostel.findById(id)
            .populate('owner', 'username email')
            .populate('ratings.user', 'username fullName')

        const hostelWithRating = addRatingInfo(updatedHostel)
        res.status(200).json({
            message: 'Hostel updated successfully',
            hostel: hostelWithRating
        })
    } catch (error) {
        next(error)
    }
})


router.post('/hostels/:id/rate', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params
        const { rating } = req.body

        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error("Invalid hostel id")
            error.status = 400
            return next(error)
        }

        if (!rating || rating < 1 || rating > 5) {
            const error = new Error("Rating must be between 1 and 5")
            error.status = 400
            return next(error)
        }

        const hostel = await Hostel.findById(id)
        if (!hostel) {
            const error = new Error("Hostel Not Found")
            error.status = 404
            return next(error)
        }

        const existingRatingIndex = hostel.ratings.findIndex(
            r => r.user.toString() === req.user._id.toString()
        )

        if (existingRatingIndex !== -1) {
            hostel.ratings[existingRatingIndex].rating = rating
            hostel.ratings[existingRatingIndex].createdAt = new Date()
        } else {
            hostel.ratings.push({
                user: req.user._id,
                rating: rating
            })
        }

        await hostel.save()

        const updatedHostel = await Hostel.findById(id)
            .populate('owner', 'username email')
            .populate('ratings.user', 'username fullName')

        const hostelWithRating = addRatingInfo(updatedHostel)
        res.status(200).json({
            message: existingRatingIndex !== -1 ? 'Rating updated successfully' : 'Rating added successfully',
            hostel: hostelWithRating
        })
    } catch (error) {
        next(error)
    }
})

module.exports = router

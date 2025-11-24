const mongoose = require('mongoose')

const hostelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    type: { type: String, enum: ['Boys', 'Girls'], required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    phone: { type: String, required: true },
    amenities: { type: [String], default: [] },
    images: { type: [String], required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    ratings: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Hostel', hostelSchema)

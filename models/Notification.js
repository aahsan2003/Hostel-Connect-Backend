const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['success', 'error', 'info', 'warning'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'relatedType'
    },
    relatedType: {
        type: String,
        enum: ['Order', 'Booking', 'Hostel'],
        default: null
    },
    read: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});


notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);


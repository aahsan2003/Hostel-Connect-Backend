const Notification = require('../models/Notification');
const mongoose = require('mongoose');


const createNotification = async (userId, type, message, relatedId = null, relatedType = null) => {
    try {
        const notification = new Notification({
            user: userId,
            type,
            message,
            relatedId,
            relatedType
        });
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};


const getUserNotifications = async (req, res, next) => {
    try {
        const userId = req.user._id;
        
        const notifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(100); 

        res.status(200).json({ notifications });
    } catch (error) {
        next(error);
    }
};


const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error('Invalid notification ID');
            error.status = 400;
            return next(error);
        }

        const notification = await Notification.findOne({ _id: id, user: userId });
        if (!notification) {
            const error = new Error('Notification not found');
            error.status = 404;
            return next(error);
        }

        notification.read = true;
        await notification.save();

        res.status(200).json({ message: 'Notification marked as read', notification });
    } catch (error) {
        next(error);
    }
};


const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user._id;

        await Notification.updateMany(
            { user: userId, read: false },
            { $set: { read: true } }
        );

        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        next(error);
    }
};


const deleteNotification = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error('Invalid notification ID');
            error.status = 400;
            return next(error);
        }

        const notification = await Notification.findOneAndDelete({ _id: id, user: userId });
        if (!notification) {
            const error = new Error('Notification not found');
            error.status = 404;
            return next(error);
        }

        res.status(200).json({ message: 'Notification deleted' });
    } catch (error) {
        next(error);
    }
};


const getUnreadCount = async (req, res, next) => {
    try {
        const userId = req.user._id;
        
        const count = await Notification.countDocuments({ user: userId, read: false });

        res.status(200).json({ unreadCount: count });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createNotification,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount
};


const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount
} = require('../controllers/notificationController');


router.get('/notification', requireAuth, getUserNotifications);


router.put('/notification/:id/read', requireAuth, markAsRead);


router.put('/notification/read-all', requireAuth, markAllAsRead);


router.delete('/notification/:id', requireAuth, deleteNotification);


router.get('/notification/unread-count', requireAuth, getUnreadCount);

module.exports = router;


const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { requireRole } = require('../middleware/requireRole');
const {
    createBooking,
    getStudentBookings,
    getOwnerBookings,
    updateBookingStatus
} = require('../controllers/bookingController');


router.post('/booking', requireAuth, createBooking);


router.get('/booking/student', requireAuth, getStudentBookings);


router.get('/booking/owner', requireAuth, requireRole('HostelOwner'), getOwnerBookings);


router.put('/booking/:id/status', requireAuth, requireRole('HostelOwner'), updateBookingStatus);

module.exports = router;


const Booking = require('../models/Booking');
const Hostel = require('../models/Hostel');
const mongoose = require('mongoose');
const { createNotification } = require('./notificationController');


const createBooking = async (req, res, next) => {
    try {
        const { hostelId, studentName, phone, email, seats, checkInDate } = req.body;

        
        if (!hostelId || !studentName || !phone || !email || !seats || !checkInDate) {
            const error = new Error('Missing required fields');
            error.status = 400;
            return next(error);
        }

        
        if (!mongoose.Types.ObjectId.isValid(hostelId)) {
            const error = new Error('Invalid hostel ID');
            error.status = 400;
            return next(error);
        }

        
        const hostel = await Hostel.findById(hostelId).populate('owner');
        if (!hostel) {
            const error = new Error('Hostel not found');
            error.status = 404;
            return next(error);
        }

        
        if (hostel.status !== 'Approved') {
            const error = new Error('Cannot book unapproved hostels');
            error.status = 400;
            return next(error);
        }

        
        const studentId = req.user._id;
        const ownerId = hostel.owner._id;

        
        const booking = new Booking({
            student: studentId,
            owner: ownerId,
            hostel: hostelId,
            studentName,
            phone,
            email,
            seats,
            checkInDate: new Date(checkInDate),
            status: 'Pending'
        });

        await booking.save();

        
        await booking.populate('student', 'username email fullName');
        await booking.populate('owner', 'username email fullName');
        await booking.populate('hostel', 'name price');

        
        try {
            await createNotification(
                ownerId,
                'info',
                `New booking request for ${hostel.name} from ${studentName}`,
                booking._id,
                'Booking'
            );
        } catch (notifError) {
            console.error('Error creating notification for owner:', notifError);
        }

        res.status(201).json({
            message: 'Booking request created successfully',
            booking
        });
    } catch (error) {
        next(error);
    }
};


const getStudentBookings = async (req, res, next) => {
    try {
        const studentId = req.user._id;

        const bookings = await Booking.find({ student: studentId })
            .populate('owner', 'username email fullName')
            .populate('hostel', 'name price images location')
            .sort({ createdAt: -1 });

        res.status(200).json({ bookings });
    } catch (error) {
        next(error);
    }
};


const getOwnerBookings = async (req, res, next) => {
    try {
        const ownerId = req.user._id;

        const bookings = await Booking.find({ owner: ownerId })
            .populate('student', 'username email fullName')
            .populate('hostel', 'name price images location')
            .sort({ createdAt: -1 });

        res.status(200).json({ bookings });
    } catch (error) {
        next(error);
    }
};


const updateBookingStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error('Invalid booking ID');
            error.status = 400;
            return next(error);
        }

        
        const validStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            error.status = 400;
            return next(error);
        }

        
        const booking = await Booking.findById(id);
        if (!booking) {
            const error = new Error('Booking not found');
            error.status = 404;
            return next(error);
        }

        
        if (booking.owner.toString() !== req.user._id.toString()) {
            const error = new Error('You can only update bookings for your own hostels');
            error.status = 403;
            return next(error);
        }

        
        const previousStatus = booking.status;

        
        booking.status = status;
        await booking.save();

        
        await booking.populate('student', 'username email fullName');
        await booking.populate('owner', 'username email fullName');
        await booking.populate('hostel', 'name price images');

        
        if (previousStatus !== status && booking.student) {
            const hostelName = booking.hostel?.name || 'hostel';
            let notificationMessage = '';
            let notificationType = 'info';

            if (status === 'Approved') {
                notificationMessage = `Your booking request for "${hostelName}" has been approved!`;
                notificationType = 'success';
            } else if (status === 'Rejected') {
                notificationMessage = `Your booking request for "${hostelName}" has been rejected.`;
                notificationType = 'error';
            } else if (status === 'Cancelled') {
                notificationMessage = `Your booking for "${hostelName}" has been cancelled.`;
                notificationType = 'error';
            }

            if (notificationMessage) {
                try {
                    await createNotification(
                        booking.student._id,
                        notificationType,
                        notificationMessage,
                        booking._id,
                        'Booking'
                    );
                } catch (notifError) {
                    console.error('Error creating notification:', notifError);
                }
            }
        }

        res.status(200).json({
            message: 'Booking status updated successfully',
            booking
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createBooking,
    getStudentBookings,
    getOwnerBookings,
    updateBookingStatus
};


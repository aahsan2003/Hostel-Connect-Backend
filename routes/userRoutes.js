const express = require('express')
const { loginUser, signUpUser, getUser, verifyEmail, forgotPassword, resetPassword, getAllUsers, toggleUserStatus, updateProfile, changePassword } = require('../controllers/userController')
const isVerified = require('../middleware/isVerified')
const requireAuth = require('../middleware/requireAuth')
const { requireRole } = require('../middleware/requireRole')
const router = express.Router()

router.post('/login', loginUser)
router.post('/signup', signUpUser)
router.get('/verify/:token', verifyEmail)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password/:token', resetPassword)


router.put('/profile', requireAuth, updateProfile)
router.put('/change-password', requireAuth, changePassword)


router.get('/admin/users', requireAuth, requireRole('admin'), getAllUsers)
router.put('/admin/users/:id/status', requireAuth, requireRole('admin'), toggleUserStatus)


router.get('/:username', getUser)

module.exports = router
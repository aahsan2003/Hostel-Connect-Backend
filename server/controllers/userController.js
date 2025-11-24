const User = require('../models/userModel')
const jwt = require('jsonwebtoken')
const transporter = require('../utils/mailer')
const bcrypt = require('bcrypt')

const createToken = (user) => {
    return jwt.sign({
        _id: user._id,
        username: user.username,
        role: user.role
    }, process.env.SECRET, { expiresIn: '3d' })
}

const loginUser = async (req, res, next) => {
    const { identifier, password } = req.body

    try {
        const user = await User.login(identifier, password)

        if (!user.isVerified) {
            throw Error('Please verify your email before logging in')
        }

        const role = user.role
        const username = user.username


        const token = createToken(user)

        res.status(200).json({
            username,
            token,
            role,
            isSuspended: user.isSuspended || false,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                isSuspended: user.isSuspended || false
            }
        })
    } catch (error) {
        next(error)
    }
}

const signUpUser = async (req, res, next) => {
    const { username, email, password, role, fullName, phone } = req.body

    try {
        console.log("signUpUser called with:", { username, email, role, fullName, phone });
        const user = await User.signup(username, email, password, role, fullName, phone)
        console.log("User created:", user._id);


        const token = jwt.sign({ _id: user._id }, process.env.SECRET, { expiresIn: '1h' });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const verificationLink = `${frontendUrl}/verify-email/${token}`


        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn("Email credentials missing. Skipping email sending.");
        } else {
            try {
                const mail = await transporter.sendMail({
                    from: `"HostelConnect" <${process.env.EMAIL_USER}>`,
                    to: user.email,
                    subject: 'Verify your email',
                    html: `
                        <h2>Welcome ${user.username}!</h2>
                        <p>Click below to verify your account:</p>
                        <a href="${verificationLink}">${verificationLink}</a>
                    `,
                });
                console.log("Verification email sent:", mail.messageId);
            } catch (emailError) {
                console.error("Failed to send verification email. Error details:", emailError);



            }
        }

        res.status(201).json({ message: `${username} registered successfully. Please check your email and verify`, token })
    } catch (error) {
        next(error)
    }
}

const getUser = async (req, res, next) => {
    const { username } = req.params

    try {
        const user = await User.findOne({ username }).select("-password")
        if (user.length == 0) {
            return res.status(404).json({ error: 'user not found' })
        }
        res.status(200).json(user)
    } catch (error) {
        next(error)
    }
}

const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.params
        const decoded = jwt.verify(token, process.env.SECRET)
        console.log(decoded)
        const user = await User.findById(decoded._id)
        console.log(user)
        if (!user) return res.status(400).json({ error: "Invalid Token" })

        if (user.isVerified) {
            console.log("verified")
            return res.status(200).json({ message: "Already Verified" })
        }

        user.isVerified = true
        await user.save()

        res.status(200).json({ message: "Email verified successfully" })
    } catch (error) {
        console.log("Verification failed")
        next(error)
    }
}

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body

        const user = await User.findOne({ email })
        if (!user) return res.status(404).json({ message: "Email not found" })

        const token = jwt.sign({ _id: user._id }, process.env.SECRET, { expiresIn: '1h' });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetLink = `${frontendUrl}/reset-password/${token}`

        const mail = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `<p>Click the link to reset your password:</p>
             <a href="${resetLink}">${resetLink}</a>
             <p>This link expires in 1 hour.</p>`
        }

        await transporter.sendMail(mail)
        res.status(200).json({ message: "Password reset link sent to your email" })
    } catch (error) {
        next(error)
    }
}

const resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params
        const { newPassword } = req.body

        if (!newPassword) return res.status(400).json({ error: "New password is required" })

        const decoded = jwt.verify(token, process.env.SECRET)
        const user = await User.findById(decoded._id)
        if (!user) return res.status(404).json({ error: 'Invalid token' })

        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(newPassword, salt)
        await user.save()

        res.status(200).json({ message: "Password has been reset successfully" })
    } catch (error) {
        next(error)
    }
}

const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 })
        res.status(200).json(users)
    } catch (error) {
        next(error)
    }
}

const toggleUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params
        const { action } = req.body

        const user = await User.findById(id)
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        if (user.role === 'admin') {
            return res.status(403).json({ error: 'Cannot suspend admin users' })
        }

        if (action === 'suspend') {
            user.isSuspended = true
        } else if (action === 'resume') {
            user.isSuspended = false
        } else {
            return res.status(400).json({ error: 'Invalid action. Use "suspend" or "resume"' })
        }

        await user.save()
        res.status(200).json({ message: `User ${action === 'suspend' ? 'suspended' : 'resumed'} successfully`, user })
    } catch (error) {
        next(error)
    }
}

const updateProfile = async (req, res, next) => {
    try {
        const { fullName, phone } = req.body
        const userId = req.user._id

        if (!fullName && !phone) {
            return res.status(400).json({ error: 'Please provide at least one field to update' })
        }

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        if (fullName) user.fullName = fullName
        if (phone) user.phone = phone

        await user.save()

        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                phone: user.phone,
                role: user.role
            }
        })
    } catch (error) {
        next(error)
    }
}

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body
        const userId = req.user._id

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Please provide both current and new password' })
        }

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }


        const match = await bcrypt.compare(currentPassword, user.password)
        if (!match) {
            return res.status(400).json({ error: 'Current password is incorrect' })
        }


        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(newPassword, salt)
        await user.save()

        res.status(200).json({ message: 'Password changed successfully' })
    } catch (error) {
        next(error)
    }
}

const getCurrentUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('-password')
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }
        res.status(200).json(user)
    } catch (error) {
        next(error)
    }
}

module.exports = {
    loginUser,
    signUpUser,
    getUser,
    verifyEmail,
    forgotPassword,
    resetPassword,
    getAllUsers,
    toggleUserStatus,
    updateProfile,
    changePassword
}
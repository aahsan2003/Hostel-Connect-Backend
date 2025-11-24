const jwt = require('jsonwebtoken')
const User = require('../models/userModel')

const requireAuth = async (req, res, next) => {
    const { authorization } = req.headers;

    if (!authorization) {
        return res.status(401).json({ 
            error: 'authorization required',
            message: 'Please include an Authorization header with Bearer token'
        })
    }

    
    if (!authorization.startsWith('Bearer ')) {
        return res.status(401).json({ 
            error: 'invalid authorization format',
            message: 'Authorization header must be in format: Bearer <token>'
        })
    }

    const token = authorization.split(' ')[1]

    if (!token) {
        return res.status(401).json({ 
            error: 'token required',
            message: 'Token is missing from Authorization header'
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET)
        req.user = decoded
        next()
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'token expired', message: 'Your session has expired. Please login again.' })
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'invalid token', message: 'Invalid authentication token' })
        }
        return res.status(401).json({ error: 'not authorized', message: 'Authentication failed' })
    }
}

module.exports = requireAuth
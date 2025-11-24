
const User = require('../models/userModel')

const isVerified = async (req, res, next) => {
  try {
    const user = req.user 
    if (!user) return res.status(401).json({ error: 'Not authenticated' })

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Email not verified' })
    }

    next()
  } catch (error) {
    next(error)
  }
}

module.exports = isVerified

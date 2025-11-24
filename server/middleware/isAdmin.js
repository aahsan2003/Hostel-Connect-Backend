const isAdmin = (req, res, next) => {
  const user = req.user 
  if (!user) return res.status(401).json({ error: 'Not authenticated' })

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  next()
}

module.exports = isAdmin

const User = require('../models/userModel')

module.exports.requireRole = (role) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user._id) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            
            const user = await User.findById(req.user._id);
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            
            if (user.role !== role) {
                return res.status(403).json({ 
                    message: `Only ${role} can perform this action`,
                    userRole: user.role,
                    requiredRole: role
                });
            }

            
            req.user = {
                ...req.user,
                role: user.role
            };

            next();
        } catch (error) {
            return res.status(500).json({ message: 'Error checking user role', error: error.message });
        }
    };
};

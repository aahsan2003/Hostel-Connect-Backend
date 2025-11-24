const express = require('express')
const mongoose = require('mongoose')
const morgan = require('morgan')
const path = require('path')
require('dotenv').config()

const hostelRoutes = require('./routes/hostelRoutes')
const userRoutes = require('./routes/userRoutes')
const bookingRoutes = require('./routes/bookingRoutes')
const orderRoutes = require('./routes/orderRoutes')
const favoriteRoutes = require('./routes/favoriteRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const reviewRoutes = require('./routes/reviewRoutes')

const app = express()
const cors = require('cors')

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(morgan('dev'));

// Static files
app.use('/images', express.static(path.join(__dirname, 'images')))

// MongoDB connection
mongoose.connect('mongodb://mongo:RXdlgzmrSoESgFzMsVXGehiogFqWstxc@turntable.proxy.rlwy.net:21113/hostelconnect')
    .then(() => console.log("MONGODB Connected"))
    .catch((err) => console.log(err))

// API routes
app.use('/api', hostelRoutes)
app.use('/api/auth', userRoutes)
app.use('/api', bookingRoutes)
app.use('/api', orderRoutes)
app.use('/api', favoriteRoutes)
app.use('/api', notificationRoutes)
app.use('/api', reviewRoutes)

// Serve frontend (if built)
app.use(express.static(path.join(__dirname, '../dist')))

// Error handler
app.use((err, req, res, next) => {
    console.log(err.stack)
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    })
})

// Start server
const port = 8000
app.listen(port, () => {
    console.log(`Listening on port: ${port}`)
})

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


app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(morgan('dev'));



app.use('/images', express.static(path.join(__dirname, 'images')))


mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MONGODB Connected"))
    .catch((err) => console.log(err))


app.use('/api', hostelRoutes)
app.use('/api/auth', userRoutes)
app.use('/api', bookingRoutes)
app.use('/api', orderRoutes)
app.use('/api', favoriteRoutes)
app.use('/api', notificationRoutes)
app.use('/api', reviewRoutes)


app.use(express.static(path.join(__dirname, '../dist')))








app.use((err, req, res, next) => {
    console.log(err.stack)
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    })
})

const port = 8000
app.listen(port, () => {
    console.log(`Listening on port: ${port}`)
})
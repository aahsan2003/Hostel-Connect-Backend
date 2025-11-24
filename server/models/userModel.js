const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const validator = require('validator')
const { type } = require('express/lib/response')

const Schema = mongoose.Schema

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["customer", "admin", "HostelOwner", "student"],
        default: "student"
    },
    fullName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isSuspended: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })



userSchema.statics.signup = async function (username, email, password, role, fullName, phone) {
    
    if (!username || !email || !password) {
        throw Error('All fields must be filled')
    }

    if (username.length < 3) {
        throw Error('Username must be at least 3 character long')
    }

    if (!validator.isEmail(email)) {
        throw Error('Invalid Email')
    }

    if (!validator.isStrongPassword(password)) {
        throw Error('Password not strong enough')
    }

    const existingUser = await this.findOne({ $or: [{ email }, { username }] })

    if (existingUser) {
        if (existingUser.email == email) {
            throw Error("Email already in use")
        }

        if (existingUser.username == username) {
            throw Error("Username Already Taken")
        }
    }

    console.log("User.signup: hashing password");
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)
    console.log("User.signup: creating user in DB");
    const user = await this.create({ username, email, password: hash, role, fullName, phone })
    console.log("User.signup: user created");

    return user
}

userSchema.statics.login = async function (identifier, password) {
    if (!identifier || !password) {
        throw Error("All fields must be filled")
    }

    const user = await this.findOne({
        $or: [{ email: identifier }, { username: identifier }]
    })

    if (!user) {
        throw Error('Invalid Username or email')
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
        throw Error('Incorrect Password')
    }

    if (user.isSuspended) {
        throw Error('Your account has been suspended. Please contact the administrator.')
    }

    return user
}

module.exports = mongoose.model('User', userSchema)
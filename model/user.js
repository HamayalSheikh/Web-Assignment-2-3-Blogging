const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true, // Ensures that each user has a unique email address
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    token: String,
    followers:
        [{
            type: Number,
            ref: 'User'
        }],
    // userId: {
    //     type: Number,
    //     unique: true,
    //     required: true,
    // },
    notifications: [{
        content: {
            type: String,
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        read: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ['active', 'blocked'],
            default: 'active',
        },
    }],
});



const User = mongoose.model('User', userSchema);

module.exports = User;

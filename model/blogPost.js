const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming user model is named 'User'
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    postId: {
        type: Number,
        unique: true,
        required: true,
    },
    ratings: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        value: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        text: {
            type: String,
            required: true,
        },
    }],
    keywords: {
        type: [String],
        default: [],
    },
    categories: {
        type: [String],
        default: [],
    },
    authors: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: [],
    },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
});

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

module.exports = BlogPost;

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    userId: {
        type: Number,
        ref: 'User',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const postSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    userId: {
        type: Number,
        ref: 'User',
        required: true,
    },
    comments: [commentSchema],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;

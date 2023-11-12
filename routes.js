const express = require('express');
const User = require('./model/user');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const BlogPost = require('./model/blogPost');
const post = require('./model/post');
const router = express.Router();

router.get('/users', (req, res) => {
    res.json(req.body);
});

// Authentication middleware
let AuthenticateUser = async (req, res, next) => {

    // Get the token from the request headers
    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized - Missing token' });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.TOKEN_KEY);

        const user = await User.findById(decoded.userId);
        if (!user || user.status === 'blocked') {
            return res.status(401).json({ message: 'Unauthorized - Invalid user or blocked' });
        }
        console.log('Token Key:', process.env.TOKEN_KEY);

        // Attach the decoded user information to the request for later use
        req.User = decoded;

        // Continue to the next middleware or route handler
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Unauthorized - Token expired' });
        }
        return res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }
};

const checkRole = (requiredRole) => {
    return (req, res, next) => {
        if (req.User && req.User.role === requiredRole) {
            next();
        } else {
            res.status(403).json({ message: 'Permission denied' });
        }
    };
};

// View all users route
router.get('/admin/users', async (req, res) => {
    try {
        // Fetch all users from the database
        const users = await User.find({}, '-password'); // Exclude password field from the response

        res.status(200).json(users);
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// // User registration route
// router.post('/register', async (req, res) => {
//     try {
//         // Extract user data from request body
//         const { username, email, password, role } = req.body;

//         // Validate user input
//         if (!username || !email || !password || !role) {
//             return res.status(400).json({ message: 'All fields are required' });
//         }

//         // const maxUserId = await User.findOne().sort({ userId: -1 }).select('userId');
//         // console.log('maxUserId:', maxUserId);
//         // const nextUserId = parseInt(maxUserId ? maxUserId.userId + 1 : 1);
//         // console.log('nextUserId:', nextUserId);

//         const maxUserIdDoc = await User.findOne({}, { userId: 1 }).sort({ userId: -1 });
//         const maxUserId = maxUserIdDoc ? maxUserIdDoc.userId : 0;

//         console.log('maxUserId:', maxUserId);
//         const nextUserId = maxUserId + 1;
//         console.log('nextUserId:', nextUserId);

//         //const nextUserId = maxUserId + 1;
//         //const nextUserId = parseInt(maxUserId) + 1;
//         //console.log('nextUserId:', nextUserId);

//         const saltRounds = 10;
//         const hashedPassword = await bcrypt.hash(password, saltRounds);

//         // Check if the user already exists in the database
//         const existingUser = await User.findOne({ email });

//         if (existingUser) {
//             return res.status(409).json({ message: 'User already exists' });
//         }

//         // Create a new user instance
//         const newUser = new User({
//             username,
//             email,
//             password: hashedPassword,
//             role,
//             userId: nextUserId,
//         });

//         console.log('newUser:', newUser);

//         // Save the user to the database
//         await newUser.save();

//         // Create a JWT token for the newly registered user
//         const token = jwt.sign(
//             { userId: newUser._id, email: newUser.email },
//             process.env.TOKEN_KEY,
//             { expiresIn: '2h' }
//         );

//         // Attach the token to the user object 
//         newUser.token = token;

//         // Send a success response with the user and token
//         res.status(201).json({
//             user: newUser,
//             token,
//         });
//     } catch (error) {
//         console.error('MongoDB Error:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });


// User registration route
router.post('/register', async (req, res) => {
    try {
        // Extract user data from request body
        const { username, email, password, role } = req.body;

        // Validate user input
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Check if the user already exists in the database
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({ message: 'User already exists' });
        }

        // Create a new user instance with the default role as "user"
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role: 'user',
        });

        // Save the user to the database
        await newUser.save();

        // Create a JWT token for the newly registered user
        const token = jwt.sign(
            { userId: newUser._id, email: newUser.email },
            process.env.TOKEN_KEY,
            { expiresIn: '2h' }
        );

        // Attach the token to the user object (optional)
        newUser.token = token;

        // Send a success response with the user and token
        res.status(201).json({
            user: newUser,
            token,
        });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


router.get('/profile', AuthenticateUser, (req, res) => {
    res.status(200).json({ "Message": "This is a protected route", user: req.User });
});

// User login route
router.post('/login', async (req, res) => {
    try {
        // Extract user data from request body
        const { email, password } = req.body;

        // Validate user input
        if (!email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if the user exists in the database
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);


        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // if (user.password !== password) {
        //     return res.status(401).json({ message: 'Invalid credentials' });
        // }

        // Create a JWT token for the authenticated user
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.TOKEN_KEY,
            { expiresIn: '2h' }
        );

        // Attach the token to the user object 
        user.token = token;

        // Send a success response with the user and token
        res.status(200).json({
            user,
            token,
        });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// User-related routes
router.get('/users', AuthenticateUser, (req, res) => {
    User.find({}, (err, users) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        res.status(200).json(users);
    });
});

router.post('/users', AuthenticateUser, checkRole('admin'), async (req, res) => {
    try {

        const { username, email, password, role } = req.body;

        // Validate user input
        if (!username || !email || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if the user already exists in the database
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({ message: 'User already exists' });
        }

        // Create a new user instance
        const newUser = new User({
            username,
            email,
            password,
            role,
        });

        // Save the user to the database
        await newUser.save();

        // Send a success response with the newly created user
        res.status(201).json({ user: newUser });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


router.get('/profile', AuthenticateUser, async (req, res) => {
    try {
        const userId = req.User.userId;
        const user = await User.findById(userId);

        if (!user || user.status === 'blocked') {
            return res.status(403).json({ message: 'Forbidden - User not found or blocked' });
        }

        let response;

        if (req.User.role === 'admin') {
            response = { user };
        } else {
            response = { user: { username: user.username, email: user.email, role: user.role } };
        }

        res.status(200).json(response);
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// // User profile retrieval route
// router.get('/profile', AuthenticateUser, (req, res) => {
//     // Retrieve the user ID from the authenticated user's token
//     const userId = req.User.userId;

//     // Find the user in the database based on the ID
//     User.findById(userId, (err, user) => {
//         if (err) {
//             console.error(err);
//             return res.status(500).json({ message: 'Internal Server Error' });
//         }

//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         // Determine the response based on user role
//         let response;
//         if (req.User.role === 'admin') {
//             // Admins get more details
//             response = { user };
//         } else {
//             // Regular users get limited details
//             response = { user: { username: user.username, email: user.email, role: user.role } };
//         }

//         res.status(200).json(response);


//         // Send the user profile as the response
//         //res.status(200).json({ user });
//         //res.status(200).json({ user: { username: user.username, email: user.email, role: user.role } });

//     });
// });

// // User profile update route
// router.put('/profile', AuthenticateUser, (req, res) => {
//     // Retrieve the user ID from the authenticated user's token
//     const userId = req.User.userId;

//     // Find the user in the database based on the ID
//     User.findById(userId, (err, user) => {
//         if (err) {
//             console.error(err);
//             return res.status(500).json({ message: 'Internal Server Error' });
//         }

//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         // Update user fields based on the request body
//         user.username = req.body.username || user.username;
//         user.email = req.body.email || user.email;
//         // Add more fields as needed

//         // Save the updated user to the database
//         user.save((err, updatedUser) => {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).json({ message: 'Internal Server Error' });
//             }

//             // Send the updated user profile as the response
//             res.status(200).json({ user: updatedUser });
//         });
//     });
// });

// User profile update route
router.put('/profile', AuthenticateUser, async (req, res) => {
    try {
        // Retrieve the user ID from the authenticated user's token
        const userId = req.User.userId;

        // Find the user in the database based on the ID
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user fields based on the request body
        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;

        // Only allow certain fields to be updated based on the user's role
        if (req.User.role === 'admin') {
            // Admins can update any field
            user.role = req.body.role || user.role;
        }

        // Save the updated user to the database
        await user.save();

        // Send the updated user profile as the response
        res.status(200).json({ user });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// // Create a new blog post
// router.post('/blog-posts', AuthenticateUser, async (req, res) => {
//     try {
//         const { title, content } = req.body;
//         const userId = req.User.userId;

//         // const latestBlogPost = await BlogPost.findOne().sort({ postId: -1 });

//         // const newPostId = latestBlogPost ? latestBlogPost.postId + 1 : 1;

//         const maxPostId = await BlogPost.findOne().sort({ postId: -1 }).select('postId');

//         const nextPostId = maxPostId ? maxPostId.postId + 1 : 1;

//         const newBlogPost = new BlogPost({
//             title,
//             content,
//             owner: userId,
//             //postId: isNaN(nextPostId),
//             postId: nextPostId,
//             //postId: maxPostId ? maxPostId.postId + 1 : 1,
//             //postId: newPostId,
//         });

//         await newBlogPost.validate();

//         await newBlogPost.save();

//         res.status(201).json({ blogPost: newBlogPost });
//     } catch (error) {
//         console.error('MongoDB Error:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });
router.post('/blog-posts', AuthenticateUser, async (req, res) => {
    try {
        const { title, content, keywords, categories } = req.body;
        const userId = req.User.userId;

        const maxPostId = await BlogPost.findOne().sort({ postId: -1 }).select('postId');
        const nextPostId = maxPostId ? maxPostId.postId + 1 : 1;

        const newBlogPost = new BlogPost({
            title,
            content,
            owner: userId,
            postId: nextPostId,
            keywords: keywords || [],
            categories: categories || [],
            authors: [userId], // The creator is automatically an author
        });

        await newBlogPost.validate();
        await newBlogPost.save();

        res.status(201).json({ blogPost: newBlogPost });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



// // Get all blog posts extra function
// router.get('/blog-posts', async (req, res) => {
//     try {
//         const blogPosts = await BlogPost.find().populate('owner', 'username'); 

//         res.status(200).json({ blogPosts });
//     } catch (error) {
//         console.error('MongoDB Error:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });

// // Get all blog posts with pagination and filtering
// router.get('/blog-posts', async (req, res) => {
//     try {
//         const { page = 1, limit = 10, title } = req.query;
//         const query = {};

//         // Apply filtering by title if provided
//         if (title) {
//             query.title = { $regex: title, $options: 'i' }; // Case-insensitive regex search
//         }

//         // Calculate skip value based on page and limit
//         const skip = (page - 1) * limit;


//         // console.log('Title:', title);
//         // console.log('Query:', query);

//         // Fetch blog posts with pagination and filtering
//         const blogPosts = await BlogPost.find(query)
//             .populate('owner', 'username')
//             .skip(skip)
//             .limit(parseInt(limit));

//         res.status(200).json({ blogPosts });
//     } catch (error) {
//         console.error('MongoDB Error:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });

// Get all blog posts with pagination, sorting, and filtering
router.get('/blog-posts', async (req, res) => {
    try {
        const { page = 1, limit = 10, title, sortBy, sortOrder } = req.query;
        const query = {};

        // Apply filtering by title if provided
        if (title) {
            query.title = { $regex: title, $options: 'i' }; // Case-insensitive regex search
        }

        // Set default sorting options
        let sortOptions = { createdAt: -1 }; // Default to sorting by createdAt in descending order

        if (sortBy) {
            sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        }

        // Calculate skip value based on page and limit
        const skip = (page - 1) * limit;

        // Fetch blog posts with pagination, sorting, and filtering
        const blogPosts = await BlogPost.find(query)
            .populate('owner', 'username')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));


        const blogPostsWithAverageRating = blogPosts.map(post => {
            const ratings = post.ratings.map(rating => rating.value);
            const averageRating = ratings.length > 0 ? ratings.reduce((acc, val) => acc + val) / ratings.length : 0;
            return {
                title: post.title,
                author: post.owner.username,
                creationDate: post.createdAt,
                averageRating: averageRating.toFixed(2),
            };
        });

        //res.status(200).json({ blogPosts });
        res.status(200).json({ blogPosts: blogPostsWithAverageRating });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// Get a specific blog post by ID
router.get('/blog-posts/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const numericPostId = parseInt(postId);

        if (isNaN(numericPostId)) {
            return res.status(400).json({ message: 'Invalid postId provided' });
        }


        if (!postId) {
            return res.status(400).json({ message: 'Invalid postId provided' });
        }
        //const blogPost = await BlogPost.findById(postId).populate('owner', 'username');

        const blogPost = await BlogPost.findOne({ postId: numericPostId }).populate('owner', 'username');

        if (!blogPost) {
            return res.status(404).json({ message: 'Blog post not found' });
        }

        res.status(200).json({ blogPost });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Update a blog post by ID
router.put('/blog-posts/:postId', AuthenticateUser, async (req, res) => {
    try {
        const { postId } = req.params;
        const { title, content } = req.body;
        const userId = req.User.userId;

        const numericPostId = parseInt(postId);

        if (isNaN(numericPostId)) {
            return res.status(400).json({ message: 'Invalid postId provided' });
        }

        const blogPost = await BlogPost.findOne({ postId: numericPostId });


        if (!blogPost) {
            return res.status(404).json({ message: 'Blog post not found' });
        }

        // Check if the user is the owner of the blog post
        if (blogPost.owner.toString() !== userId) {
            return res.status(403).json({ message: 'Permission denied - You are not the owner of this blog post' });
        }

        // Update the blog post
        blogPost.title = title || blogPost.title;
        blogPost.content = content || blogPost.content;

        await blogPost.save();

        res.status(200).json({ blogPost });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Delete a blog post by ID
router.delete('/blog-posts/:postId', AuthenticateUser, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.User.userId;

        const numericPostId = parseInt(postId);

        if (isNaN(numericPostId)) {
            return res.status(400).json({ message: 'Invalid postId provided' });
        }

        const blogPost = await BlogPost.findOne({ postId: numericPostId }).select('+owner');



        if (!blogPost) {
            return res.status(404).json({ message: 'Blog post not found' });
        }

        if (blogPost.status === 'disabled') {
            return res.status(403).json({ message: 'Permission denied - This blog post is disabled' });
        }


        // Check if the user is the owner of the blog post
        if (blogPost.owner.toString() !== userId) {
            return res.status(403).json({ message: 'Permission denied - You are not the owner of this blog post' });
        }

        blogPost.status = 'disabled';
        // Delete the blog post
        //await blogPost.remove();
        await BlogPost.deleteOne({ postId: numericPostId });

        res.status(200).json({ message: 'Blog post deleted successfully' });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Add a rating to a blog post
router.post('/blog-posts/:postId/rate', AuthenticateUser, async (req, res) => {
    try {
        const { postId } = req.params;
        const { value } = req.body;
        const userId = req.User.userId;

        const numericPostId = parseInt(postId);

        if (isNaN(numericPostId)) {
            return res.status(400).json({ message: 'Invalid postId provided' });
        }

        const blogPost = await BlogPost.findOne({ postId: numericPostId });

        if (!blogPost) {
            return res.status(404).json({ message: 'Blog post not found' });
        }

        // Check if the user has already rated
        const existingRating = blogPost.ratings.find(rating => rating.user.toString() === userId);

        if (existingRating) {
            return res.status(400).json({ message: 'You have already rated this blog post' });
        }

        // Add the new rating
        blogPost.ratings.push({ user: userId, value });
        await blogPost.save();

        res.status(200).json({ blogPost });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Add a comment to a blog post
router.post('/blog-posts/:postId/comment', AuthenticateUser, async (req, res) => {
    try {
        const { postId } = req.params;
        const { text } = req.body;
        const userId = req.User.userId;

        const numericPostId = parseInt(postId);

        if (isNaN(numericPostId)) {
            return res.status(400).json({ message: 'Invalid postId provided' });
        }

        const blogPost = await BlogPost.findOne({ postId: numericPostId });

        if (!blogPost) {
            return res.status(404).json({ message: 'Blog post not found' });
        }

        // Add the new comment
        blogPost.comments.push({ user: userId, text });
        await blogPost.save();

        res.status(200).json({ blogPost });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// Add this route to your existing router
router.post('/users/:userId/follow', AuthenticateUser, async (req, res) => {
    try {
        const { userId } = req.params;
        const followerId = req.User.userId;

        // Check if the user is trying to follow themselves
        if (userId === followerId) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }

        // Check if the user to follow exists
        const userToFollow = await User.findById(Number(userId));

        if (!userToFollow) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the user is already following the target user
        if (userToFollow.followers.includes(followerId)) {
            return res.status(400).json({ message: 'You are already following this user' });
        }

        // Add the follower to the user's followers list
        userToFollow.followers.push(followerId);
        await userToFollow.save();

        res.status(200).json({ message: 'Successfully followed user', user: userToFollow });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route for displaying the user's feed
router.get('/feed', AuthenticateUser, async (req, res) => {
    try {
        // Get the user ID from the authenticated user
        const userId = req.User.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get the list of bloggers the user is following
        const followedBloggers = user.following;

        // Retrieve posts from followed bloggers
        const feedPosts = await Post.find({ userId: { $in: followedBloggers } })
            .sort({ createdAt: -1 })
            .populate('userId');

        res.status(200).json({ feedPosts });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route for a user to follow a blogger
router.post('/follow/:bloggerId', AuthenticateUser, async (req, res) => {
    try {
        const { bloggerId } = req.params;
        const userId = req.User.userId;

        // Add the blogger to the user's following list
        await User.findByIdAndUpdate(userId, { $addToSet: { following: bloggerId } });

        res.status(200).json({ message: 'Successfully followed blogger' });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.get('/search', async (req, res) => {
    try {
        const { keywords, categories, authors, sortBy, sortOrder } = req.query;

        const query = {};

        if (keywords) {
            query.keywords = { $in: keywords.split(',') };
        }

        if (categories) {
            query.categories = { $in: categories.split(',') };
        }

        if (authors) {
            const authorIds = await User.find({ username: { $in: authors.split(',') } }).select('_id');
            query.authors = { $in: authorIds };
        }

        // Set default sorting options
        let sortOptions = { createdAt: -1 }; // Default to sorting by createdAt in descending order

        if (sortBy) {
            sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        }

        const searchResults = await BlogPost.find(query)
            .populate('owner', 'username')
            .sort(sortOptions);

        res.status(200).json({ searchResults });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.put('/admin/users/:userId/block', AuthenticateUser, checkRole('admin'), async (req, res) => {
    try {
        const { userId } = req.params;
        const userToBlock = await User.findById(userId);

        if (!userToBlock) {
            return res.status(404).json({ message: 'User not found' });
        }

        userToBlock.status = 'blocked';
        await userToBlock.save();

        res.status(200).json({ message: 'User blocked successfully', user: userToBlock });
    } catch (error) {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
const express = require('express');
const cors = require('cors');
const { connect } = require('./mongoUtil');
const app = express();
app.use(cors());
app.use(express.json());
require('dotenv').config();

connect();

const users = require('./routes/users');
const login = require('./routes/auth/login');
const forgotPassword = require('./routes/auth/forgotPassword');
const posts = require('./routes/posts');
const likes = require('./routes/likes');
const comments = require('./routes/comments');
const friends = require('./routes/friends');

app.use('/users', users);
app.use('/login', login);
app.use('/forgot-password', forgotPassword);
app.use('/posts', posts);
app.use('/likes', likes);
app.use('/comments', comments);
app.use('/friends', friends);

app.listen(3000, () => {
    console.log('Server running on port 3000')
})
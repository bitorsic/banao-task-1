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
const post = require('./routes/post');
const like = require('./routes/like');
const comment = require('./routes/comment');
const friendships = require('./routes/friendships');

app.use('/users', users);
app.use('/login', login);
app.use('/forgot-password', forgotPassword);
app.use('/post', post);
app.use('/like', like);
app.use('/comment', comment);
app.use('/friendships', friendships);

app.listen(3000, () => {
    console.log('Server running on port 3000')
})
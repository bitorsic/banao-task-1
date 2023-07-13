const express = require('express');
const cors = require('cors');
const { connect } = require('./mongoUtil');
const app = express();
app.use(cors());
app.use(express.json());
require('dotenv').config();

connect();

const register = require('./routes/auth/register');
const login = require('./routes/auth/login');
const forgotPassword = require('./routes/auth/forgotPassword');
const post = require('./routes/post');
const like = require('./routes/like');
const comment = require('./routes/comment');

app.use('/register', register);
app.use('/login', login);
app.use('/forgot-password', forgotPassword);
app.use('/post', post);
app.use('/like', like);
app.use('/comment', comment);

app.listen(3000, () => {
    console.log('Server running on port 3000')
})
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const auth = require('../helpers/auth');
const { getDb } = require('../helpers/mongoUtil');

router.post('/', async (req, res) => {
    try {
        const users = getDb().collection('users');

        const user = {
            email: req.body.email,
            password: await bcrypt.hash(req.body.password, 10),
            _id: req.body.username,
            friends: [],
            posts: [],
            likes: [],
            comments: []
        };

        await users.insertOne(user);

        res.status(201).send("Registration Successful")
    } catch (e) {
        let code = 500, message = e.message;
        if (e.code == 11000) { code = 409; message = "Username already in use" }
        res.status(code).send(message);
    }
});

router.get('/', async (req, res) => {
    try {
        const users = getDb().collection('users');

        const data = await users.find({}, 
            { projection: { friends: 1, posts: 1, likes: 1, comments: 1 } }).toArray();
        if (data.length == 0) throw 404;

        for (let i=0;i<data.length;i++) {
            data[i].username = data[i]._id; delete data[i]._id;
            data[i].friends = data[i].friends.length;
            data[i].posts = data[i].posts.length;
            data[i].likes = data[i].likes.length;
            data[i].comments = data[i].comments.length;
        }

        res.status(200).send(data)
    } catch (e) {
        let code = 500, message = e.message;
        if (e == 404) { code = e, message = "No users found" }
        res.status(code).send(message);
    }
});

router.delete('/delete/:username', auth, async (req, res) => {
    try {
        if (req.params.username != req.user.username) throw 401;

        const users = getDb().collection('users');
        const user = await users.findOne({ _id: req.params.username }, 
            { projection: { friends: 1, posts: 1, likes: 1, comments: 1 }});

        if (!user) throw 404;

        for (let i=0;i<user.friends.length;i++) {
            await users.updateOne({ _id: user.friends[i] }, { $pull: { friends: user._id } });
        }

        const axios = require('axios');
        const url = req.protocol + '://' + req.get('host');

        const posts = getDb().collection('posts');
        
        for (let i=0;i<user.likes.length;i++) {
            await posts.updateOne( { _id: user.likes[i] }, { $pull: { likes: user._id } });
        }

        for (let i=0;i<user.comments.length;i++) {
            await axios.delete(url + '/comments/' + user.comments[i], { headers: req.headers });
        }
        
        for (let i=0;i<user.posts.length;i++) {
            let result = await axios.delete(url + '/posts/' + user.posts[i], { headers: req.headers });
            console.log(result.data)
        }
        
        await users.deleteOne({ _id: user._id });

        res.status(200).send("User " + user._id + " succesfully deleted");
    } catch (e) {
        let code = 500, message = e.message;
        if (e == 401) { code = e, message = "You need to be logged in to delete your account" }
        if (e == 404) { code = e, message = "Your account was already deleted" }
        res.status(code).send(message);
    }
});

router.get('/:username', auth, async (req, res) => {
    try {
        const users = getDb().collection('users');

        let user = await users.findOne({ _id: req.params.username }, 
            { projection: { friends: 1, posts: 1, comments: 1 } });
        if (!user) throw 404;

        user.username = user._id; delete user._id;
        const axios = require('axios');
        const url = req.protocol + '://' + req.get('host');

        if (!(user.posts.length == 0)) {
            user.posts = user.posts.reverse();

            for (let i=0;i<user.posts.length;i++) {
                const result = await axios.get(url + '/posts/' + user.posts[i], { headers: req.headers });
                user.posts[i] = result.data.content;
            }
        }

        if (!(user.comments.length == 0)) {
            user.posts = user.posts.reverse();

            for (let i=0;i<user.comments.length;i++) {
                const result = await axios.get(url + '/comments/' + user.comments[i], { headers: req.headers });
                user.comments[i] = result.data.content;
            }
        }

        res.status(200).send(user)
    } catch (e) {
        let code = 500, message = e.message;
        if (e == 404) { code = e, message = "No users found" }
        res.status(code).send(message);
    }
});

module.exports = router;
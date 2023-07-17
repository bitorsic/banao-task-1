const express = require('express');
const router = express.Router();
const auth = require('../helpers/auth');
const { getDb } = require('../helpers/mongoUtil');
const { encrypt, decrypt } = require('../helpers/cryptography');

router.post('/', auth, async (req, res) => {
    try {
        const users = getDb().collection('users');
        const posts = getDb().collection('posts');

        let postId;
        let post = await posts.findOne({}, { projection: { postId: 1, _id: 0 } });
        if (!post) {
            await posts.insertOne({ _id: 0, postId: 1 }); postId = 1;
        } else postId = post.postId;

        let content = encrypt(req.body.content);

        post = {
            _id: postId,
            by: req.user.username,
            content,
            edited: false,
            likes: [],
            comments: []
        };

        await posts.insertOne(post);

        await posts.updateOne({ _id: 0 }, { $inc: { postId: 1 } });
        await users.updateOne({ _id: post.by }, { $push: { posts: post._id } });
        
        res.status(201).send("Post created with id = " + post._id);
    } catch (e) {
        let code = 500, message = e.message;
        res.status(code).send(message);
    }
});

router.get('/', auth, async (req, res) => {
    try {
        const posts = getDb().collection('posts');
        let data;
        if (!req.query.user) {
            data = await posts.find({}).sort({ _id: -1 }).toArray();
            data.pop();
        } else {
            data = await posts.find({ by: req.query.user }).sort({ _id: -1 }).toArray();
        }
        
        if (data.length == 0) throw 404;
        
        const comments = getDb().collection('comments');

        for (let i=0;i<data.length;i++) {
            data[i].content = decrypt(data[i].content);

            data[i].comments = data[i].comments.reverse();
            for (let j=0;j<data[i].comments.length;j++) {
                const comment = await comments.findOne({ _id: data[i].comments[0] }, 
                    { projection: { by: 1, content: 1, _id: 0 } });

                comment.content = decrypt(comment.content);
                data[i].comments.push([comment.by, comment.content]);
                data[i].comments.shift();
            }
        }

        res.status(200).send(data);
    } catch (e) {
        let code = 500, message = e.message;
        if (e == 404) { code = e, message = "No posts found" }
        res.status(code).send(message);
    }
});

router.get('/:postId', auth, async (req, res) => {
    try {
        const posts = getDb().collection('posts');
        let post = await posts.findOne({ _id: Number(req.params.postId) }, { projection: { _id: 0 }});
        if (!post) throw 404;
        
        post.content = decrypt(post.content);

        const comments = getDb().collection('comments');

        post.comments = post.comments.reverse();
        for (let j=0;j<post.comments.length;j++) {
            const comment = await comments.findOne({ _id: post.comments[0] }, 
                { projection: { by: 1, content: 1, _id: 0 } });

            comment.content = decrypt(comment.content);
            post.comments.push([comment.by, comment.content]);
            post.comments.shift();
        }

        res.status(200).send(post);
    } catch (e) {
        let code = 500, message = e.message;
        if (e == 404) { code = e, message = "Post with id = " + req.params.postId + " not found" }
        res.status(code).send(message);
    }
});

router.put('/:postId', auth, async (req, res) => {
    try {
        const posts = getDb().collection('posts');
        const post = await posts.findOne({ _id: Number(req.params.postId) }, { projection: { by: 1 } });
        
        if (!post) throw 404;
        if (post.by != req.user.username) throw 401;

        let content = encrypt(req.body.content);

        await posts.updateOne({ _id: post._id }, { $set: { content, edited: true } });

        res.status(200).send("Post with id = " + post._id + " edited");
    } catch (e) {
        let code = 500, message = e.message;
        if (e == 404) { code = e, message = "Post with id = " + req.params.postId + " not found" }
        if (e == 401) { code = e, message = "Post with id = " + req.params.postId + " does not belong to you" }
        res.status(code).send(message);
    }
});

router.delete('/:postId', auth, async (req, res) => {
    try {
        const posts = getDb().collection('posts');
        const post = await posts.findOne({ _id: Number(req.params.postId) }, 
        { projection: { by: 1, likes: 1, comments: 1 } });
        
        if (!post) throw 404;
        if (post.by != req.user.username) throw 401;
        
        const users = getDb().collection('users');
        await users.updateOne({ _id: post.by }, {$pull: { posts: post._id }});
        
        for (let i=0;i<post.likes.length;i++) {
            await users.updateOne({ _id: post.likes[i] }, { $pull: { likes: post._id } });
        }
        
        const axios = require('axios');
        const url = req.protocol + '://' + req.get('host');
        
        for (let i=0;i<post.comments.length;i++) {
            await axios.delete(url + '/comments/' + post.comments[i], { headers: req.headers });
        }
        
        await posts.deleteOne({ _id: post._id });

        res.status(200).send("Post with id = " + post._id + " deleted");
    } catch (e) {
        let code = 500, message = e.message;
        if (e == 404) { code = e, message = "Post with id = " + req.params.postId + " not found" }
        if (e == 401) { code = e, message = "Post with id = " + req.params.postId + " does not belong to you" }
        res.status(code).send(message);
    }
});

module.exports = router;
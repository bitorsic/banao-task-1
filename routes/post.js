const express = require('express');
const router = express.Router();
const mongoUtil = require('../mongoUtil');
const auth = require('../auth');

router.post('/', auth, async (req, res) => {
    try {
        const users = mongoUtil.getDb().collection('users');
        const posts = mongoUtil.getDb().collection('posts');

        let postId;
        let post = await posts.findOne();
        if (post == null) {
            await posts.insertOne({ _id: 0, postId: 1 });
            postId = 1;
        } else postId = post.postId;

        post = {
            _id: postId,
            by: req.user.username,
            content: req.body.content,
            edited: false,
            likes: [],
            comments: []
        };

        await posts.insertOne(post);

        await posts.updateOne(
            { _id: 0 },
            { $inc: { postId: 1 } }
        );

        await users.updateOne(
            { _id: post.by },
            { $push: { posts: post._id } }
        );
        
        res.status(201).send("Post created with id = " + post._id);
    } catch (e) {
        console.log(e)
        let code = 500, message = e;
        res.status(code).send(message);
    }
});

router.get('/', async (req, res) => {
    try {
        const posts = mongoUtil.getDb().collection('posts');
        const comments = mongoUtil.getDb().collection('comments');
        let data;
        if (req.query.user == undefined) {
            data = await posts.find({}).toArray();
            data.shift();
        } else {
            data = await posts.find({ by: req.query.user }).toArray();
        }

        if (data.length == 0) throw 404;

        for (let i=0;i<data.length;i++) {
            for (let j=0;j<data[i].comments.length;j++) {
                const comment = await comments.findOne({ _id: data[i].comments[0] });
                data[i].comments.push([comment.by, comment.content]);
                data[i].comments.shift();
            }
        }

        res.status(200).send(data);
    } catch (e) {
        let code = 500, message = e;
        if (e == 404) { code = e, message = "No posts found" }
        res.status(code).send(message);
    }
});

router.put('/', auth, async (req, res) => {
    try {
        const posts = mongoUtil.getDb().collection('posts');
        const post = await posts.findOne({ _id: Number(req.query.postId) });
        
        if (post == null) throw 404;
        if (post.by != req.user.username) throw 401;

        await posts.updateOne(
            { _id: post._id },
            { $set: { content: req.body.content, edited: true } }
        );

        res.status(200).send("Post with id = " + post._id + " edited");
    } catch (e) {
        let code = 500, message = e;
        if (e == 404) { code = e, message = "Post with given id not found" }
        if (e == 401) { code = e, message = "Post does not belong to the user" }
        res.status(code).send(message);
    }
});

router.delete('/', auth, async (req, res) => {
    try {
        const users = mongoUtil.getDb().collection('users');
        const posts = mongoUtil.getDb().collection('posts');
        const comments = mongoUtil.getDb().collection('comments');
        
        const post = await posts.findOne({ _id: Number(req.query.postId) });
        
        if (post == null) throw 404;
        if (post.by != req.user.username) throw 401;

        await posts.deleteOne({ _id: post._id });
        await users.updateOne({ _id: post.by }, {$pull: { posts: post._id }});
        
        for (let i=0;i<post.likes.length;i++) {
            await users.updateOne({ _id: post.likes[i] }, { $pull: { likes: post._id } });
        }

        for (let i=0;i<post.comments.length;i++) {
            const comment = await comments.findOne({ _id: post.comments[i] });
            await comments.deleteOne({ _id: comment._id });
            await users.updateOne({ _id: comment.by }, { $pull: { comments: comment._id } });
        }

        res.status(200).send("Post with id = " + post._id + " deleted");
    } catch (e) {
        let code = 500, message = e;
        if (e == 404) { code = e, message = "Post with given id not found" }
        if (e == 401) { code = e, message = "Post does not belong to the user" }
        res.status(code).send(message);
    }
});

module.exports = router;
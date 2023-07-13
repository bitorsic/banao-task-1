const express = require('express');
const router = express.Router();
const mongoUtil = require('../mongoUtil');
const auth = require('../auth');
const { encrypt, decrypt } = require('../cryptography');

router.post('/', auth, async (req, res) => {
    try {
        const users = mongoUtil.getDb().collection('users');
        const posts = mongoUtil.getDb().collection('posts');

        let postId;
        let post = await posts.findOne({}, { projection: { postId: 1, _id: 0 } });
        if (post == null) {
            await posts.insertOne({ _id: 0, postId: 1 }); postId = 1;
        } else postId = post.postId;

        let { iv, content } = encrypt(req.body.content);

        post = {
            _id: postId,
            by: req.user.username,
            iv, content,
            edited: false,
            likes: [],
            comments: []
        };

        await posts.insertOne(post);

        await posts.updateOne({ _id: 0 }, { $inc: { postId: 1 } });
        await users.updateOne({ _id: post.by }, { $push: { posts: post._id } });
        
        res.status(201).send("Post created with id = " + post._id);
    } catch (e) {
        console.log(e)
        let code = 500, message = e;
        res.status(code).send(message);
    }
});

router.get('/', auth, async (req, res) => {
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
            data[i].content = decrypt(data[i].iv, data[i].content);
            delete data[i].iv;

            for (let j=0;j<data[i].comments.length;j++) {
                const comment = await comments.findOne({ _id: data[i].comments[0] }, 
                    { projection: { by: 1, iv: 1, content: 1, _id: 0 } });
                console.log(comment)

                comment.content = decrypt(comment.iv, comment.content);
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
        const post = await posts.findOne({ _id: Number(req.query.postId) }, { projection: { by: 1 } });
        
        if (post == null) throw 404;
        if (post.by != req.user.username) throw 401;

        let { iv, content } = encrypt(req.body.content);

        await posts.updateOne({ _id: post._id }, { $set: { iv, content, edited: true } });

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
        
        const post = await posts.findOne({ _id: Number(req.query.postId) }, 
            { projection: { by: 1, likes: 1, comments: 1 } });
        
        if (post == null) throw 404;
        if (post.by != req.user.username) throw 401;

        await posts.deleteOne({ _id: post._id });
        await users.updateOne({ _id: post.by }, {$pull: { posts: post._id }});
        
        for (let i=0;i<post.likes.length;i++) {
            await users.updateOne({ _id: post.likes[i] }, { $pull: { likes: post._id } });
        }

        for (let i=0;i<post.comments.length;i++) {
            const comment = await comments.findOne({ _id: post.comments[i] }, { projection: { by: 1 }});
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
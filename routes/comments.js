const express = require('express');
const router = express.Router();
const auth = require('../helpers/auth');
const { getDb } = require('../helpers/mongoUtil');
const { encrypt, decrypt } = require('../helpers/cryptography');

router.post('/', auth, async (req, res) => {
    try {
        const posts = getDb().collection('posts');    
        const post = await posts.findOne({ _id: Number(req.body.postId) }, { projection: { _id: 1 } });
        if (!post) throw 404;
        
        const users = getDb().collection('users');
        const comments = getDb().collection('comments');

        let commentId;
        let comment = await comments.findOne({}, { projection: { commentId: 1, _id: 0 }});
        if (!comment) {
            await comments.insertOne({ _id: 0, commentId: 1 });
            commentId = 1;
        } else commentId = comment.commentId;

        let content = encrypt(req.body.content);

        comment = {
            _id: commentId,
            by: req.user.username,
            on: post._id,
            content
        };

        await comments.insertOne(comment);
        await comments.updateOne( { _id: 0 }, { $inc: { commentId: 1 } });

        await posts.updateOne({ _id: post._id }, { $push: { comments: comment._id } });
        await users.updateOne({ _id: comment.by }, { $push: { comments: comment._id } });
        
        res.status(201).send("Commented on post with id = " + post._id + ", comment id = " + comment._id);
    } catch (e) {
        let code = 500, message = e.message;
        if (e == 404) { code = e, message = "Post with id = " + req.body.postId + " not found" }
        res.status(code).send(message);
    }
});

router.get('/:commentId', auth, async (req, res) => {
    try {
        const comments = getDb().collection('comments');
        let comment = await comments.findOne({ _id: Number(req.params.commentId) }, { projection: { _id: 0 }});
        if (!comment) throw 404;

        const posts = getDb().collection('posts');
        comment.on = await posts.findOne({ _id: comment.on }, { projection: { by: 1, content: 1, _id: 0 }});

        comment.content = decrypt(comment.content);
        comment.on.content = decrypt(comment.on.content);

        res.status(200).send(comment);
    } catch (e) {
        let code = 500, message = e.message;
        if (e == 404) { code = e, message = "Comment with id = " + req.params.commentId + " not found" }
        res.status(code).send(message);
    }
});

router.delete('/:commentId', auth, async (req, res) => {
    try {
        const comments = getDb().collection('comments');
        const comment = await comments.findOne({ _id: Number(req.params.commentId) },
            { projection: { by: 1, on: 1 } });
        if (!comment) throw 404;
        
        const users = getDb().collection('users');
        const posts = getDb().collection('posts');
        const post = await posts.findOne({ _id: comment.on }, { projection: { by: 1 } });

        if (req.user.username != post.by && req.user.username != comment.by) throw 401;

        await comments.deleteOne({ _id: comment._id });
        await posts.updateOne( { _id: post._id }, {$pull: {comments: comment._id}});
        await users.updateOne( { _id: comment.by }, {$pull: {comments: comment._id}});

        res.status(200).send("Comment with id = " + comment._id + " deleted");
    } catch (e) {
        console.log(e)
        let code = 500, message = e.message;
        if (e == 404) { code = e, message = "Comment with id = " + req.params.commentId + " not found" }
        if (e == 401) { code = e, message = "The comment or post does not belong to " + req.user.username }
        res.status(code).send(message);
    }
});

module.exports = router;
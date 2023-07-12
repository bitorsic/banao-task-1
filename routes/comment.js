const express = require('express');
const router = express.Router();
const mongoUtil = require('../mongoUtil');
const auth = require('../auth');
const { encrypt } = require('../cryptography');

router.post('/', auth, async (req, res) => {
    try {
        const users = mongoUtil.getDb().collection('users');
        const posts = mongoUtil.getDb().collection('posts');
        const comments = mongoUtil.getDb().collection('comments');

        const post = await posts.findOne({ _id: Number(req.body.postId) });
        if (post == null) throw 404;

        let commentId;
        let comment = await comments.findOne();
        if (comment == null) {
            await comments.insertOne({ _id: 0, commentId: 1 });
            commentId = 1;
        } else commentId = comment.commentId;

        let { iv, content } = encrypt(req.body.content);

        comment = {
            _id: commentId,
            by: req.user.username,
            on: post._id,
            iv, content
        };

        await comments.insertOne(comment);
        await comments.updateOne( { _id: 0 }, { $inc: { commentId: 1 } });

        await posts.updateOne({ _id: post._id }, { $push: { comments: comment._id } });
        await users.updateOne({ _id: comment.by }, { $push: { comments: comment._id } });
        
        res.status(201).send("Commented on post with id = " + post._id + ", comment id = " + comment._id);
    } catch (e) {
        let code = 500, message = e;
        if (e == 404) { code = e, message = "Post with given id not found" }
        res.status(code).send(message);
    }
});

router.delete('/', auth, async (req, res) => {
    try {
        const users = mongoUtil.getDb().collection('users');
        const posts = mongoUtil.getDb().collection('posts');
        const comments = mongoUtil.getDb().collection('comments');

        const comment = await comments.findOne({ _id: Number(req.query.commentId) });
        if (comment == null) throw 404;
        
        const post = await posts.findOne({ _id: comment.on });

        if (req.user.username != post.by && req.user.username != comment.by) throw 401;

        await comments.deleteOne({ _id: comment._id });
        await posts.updateOne( { _id: post._id }, {$pull: {comments: comment._id}});
        await users.updateOne( { _id: comment.by }, {$pull: {comments: comment._id}});

        res.status(200).send("Comment with id = " + comment._id + " deleted");
    } catch (e) {
        let code = 500, message = e;
        if (e == 404) { code = e, message = "Comment with given id not found" }
        if (e == 401) { code = e, message = "The user is not permitted to delete the comment" }
        res.status(code).send(message);
    }
});

module.exports = router;
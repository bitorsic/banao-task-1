const express = require('express');
const router = express.Router();
const { getDb } = require('../mongoUtil');
const auth = require('../auth');

router.put('/:postId', auth, async (req, res) => {
    try {
        const posts = getDb().collection('posts');
        const post = await posts.findOne({ _id: Number(req.params.postId) },
        { projection: { likes: 1 } });
        if (!post) throw 404;

        const users = getDb().collection('users');
        let uname = req.user.username, action;

        if (post.likes.includes(uname)) {
            await posts.updateOne( { _id: post._id }, { $pull: { likes: uname } });
            await users.updateOne( { _id: uname }, { $pull: { likes: post._id } });
            action = " unliked by ";
        } else {
            await posts.updateOne({ _id: post._id }, { $push: { likes: uname } });
            await users.updateOne({ _id: uname }, { $push: { likes: post._id } });
            action = " liked by ";
        }

        res.status(200).send("Post with id = " + post._id + action + uname);
    } catch (e) {
        let code = 500, message = e.message;
        if (e == 404) { code = e, message = "Post with given id not found" }
        res.status(code).send(message);
    }
});

module.exports = router;
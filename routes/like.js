const express = require('express');
const router = express.Router();
const mongoUtil = require('../mongoUtil');
const auth = require('../auth');

router.put('/', auth, async (req, res) => {
    try {
        const users = mongoUtil.getDb().collection('users');
        const posts = mongoUtil.getDb().collection('posts');
        
        let uname = req.user.username, action;
        const post = await posts.findOne({ _id: Number(req.query.postId) },
            { projection: { likes: 1 } });
        if (post == null) throw 404;

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
        let code = 500, message = e;
        if (e == 404) { code = e, message = "Post with given id not found" }
        res.status(code).send(message);
    }
});

module.exports = router;
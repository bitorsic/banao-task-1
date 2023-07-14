const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getDb } = require('../mongoUtil');

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
        let code = 500, message = e;
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
        let code = 500, message = e;
        if (e == 404) { code = e, message = "No users found" }
        res.status(code).send(message);
    }
});

// router.delete('/delete/:username', async (req, res) => {
//     try {
//         if (req.params.username != req.user.username) throw 403;

//         const users = getDb().collection('users');
//         const user = users.findOne({ _id: req.params.username }, 
//             { projection: { friends: 1, posts: 1, likes: 1, comments: 1 }});

//         await users.deleteOne({ _id: user._id });
        
//         for (let i=0;i<user.friends.length;i++) {
//             await users.updateOne({ _id: user.friends[i] }, { $pull: { friends: user._id } });
//         }

//         res.status(200).send(data)
//     } catch (e) {
//         let code = 500, message = e;
//         if (e == 404) { code = e, message = "No users found" }
//         res.status(code).send(message);
//     }
// });

module.exports = router;
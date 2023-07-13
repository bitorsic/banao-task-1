const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getDb } = require('../../mongoUtil');

router.post('/', async (req, res) => {
    try {
        const users = getDb().collection('users');

        const user = {
            email: req.body.email,
            password: await bcrypt.hash(req.body.password, 10),
            _id: req.body.username,
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

module.exports = router;
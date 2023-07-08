const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const mongoUtil = require('../../mongoUtil');

router.post('/', async (req, res) => {
    try {
        const users = mongoUtil.getDb().collection('users');

        const user = {
            email: req.body.email,
            password: await bcrypt.hash(req.body.password, 10),
            _id: req.body.username,
            otp: "000000",
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
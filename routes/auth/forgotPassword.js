const express = require('express');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const router = express.Router();
const mongoUtil = require('../../mongoUtil');

router.get('/', async (req, res) => {
    try {
        const users = mongoUtil.getDb().collection('users');
        const user = await users.findOne({ _id: req.query.username });
        const otp = Math.floor(100000 + Math.random() * 900000);

        if (user == null) throw 403;

        let transport = nodemailer.createTransport({
            host: "sandbox.smtp.mailtrap.io",
            port: 2525,
            auth: {
                user: process.env.MAILTRAP_USER,
                pass: process.env.MAILTRAP_PASS
            }
        });

        var mailOptions = {
            to: user.email,
            subject: 'Your OTP',
            text: 'Your OTP to log in is: ' + otp
        };

        await users.updateOne({ _id: req.query.username }, { $set: { otp: otp } });

        transport.sendMail(mailOptions);

        res.status(200).send("The OTP has been sent to your email");
    } catch (e) {
        console.log(e);
        let code = 500, message = e;
        if (e == 403) { code = e, message = "The username does not exist" }
        res.status(code).send(message);
    }
});

router.put('/', async (req, res) => {
    try {
        const users = mongoUtil.getDb().collection('users');
        const user = await users.findOne({ _id: req.query.username });
        if (user == null) throw 403;
        if (req.query.otp != user.otp || user.otp == "000000") throw 401;

        await users.updateOne({ _id: req.query.username },
            {
                $set: {
                    password: await bcrypt.hash(req.body.password, 10),
                    otp: "000000"
                }
            }
        )

        res.status(200).send("The password has been reset for the user " + user._id)
    } catch (e) {
        let code = 500, message = e;
        if (e == 403) { code = e, message = "The username does not exist" }
        if (e == 401) { code = e, message = "The OTP is incorrect" }
        res.status(code).send(message);
    }
});

module.exports = router;
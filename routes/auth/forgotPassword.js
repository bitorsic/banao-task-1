const express = require('express');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken");
const router = express.Router();
const mongoUtil = require('../../mongoUtil');

router.put('/', async (req, res) => {
    try {    
        const users = mongoUtil.getDb().collection('users');
        const url = req.protocol + '://' + req.get('host');
        
        const user = await users.findOne({ _id: req.query.username });
        if (user == null) throw 403;

        const token = jwt.sign(
            { username: user._id, password: req.body.password }, 
            process.env.RESET_KEY, { expiresIn: "10m" }
        );

        let transport = nodemailer.createTransport({
            host: "smtp.zoho.in",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        var mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset',
            text: 
                'Here\'s the link to reset your password:\n' + 
                url + '/forgot-password?token=' + token +
                '\n\nThe password will be reset to the one you provided to send the email.' +
                '\nThe link is valid only for 10 minutes.'
        };

        transport.sendMail(mailOptions);

        res.status(200).send("An email with the reset link has been sent to your email id");
    } catch (e) {
        let code = 500, message = e;
        if (e == 403) { code = e, message = "The username does not exist" }
        res.status(code).send(message);
    }
});

router.get('/', async (req, res) => {
    try {
        const users = mongoUtil.getDb().collection('users');

        const decoded = jwt.verify(req.query.token, process.env.RESET_KEY);

        await users.updateOne({ _id: decoded.username },{
            $set: { password: await bcrypt.hash(decoded.password, 10) }
        });

        res.status(200).send("Password successfully reset")
    } catch (e) {
        if (e.name == "TokenExpiredError") { message = "The link has expired" }
        if (e.name == "JsonWebTokenError") { message = "Please recheck and re-enter the link" }
        res.status(401).send(message);
    }
});

module.exports = router;
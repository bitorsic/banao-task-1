const express = require('express');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken");
const router = express.Router();
const { getDb } = require('../../helpers/mongoUtil');
const { encrypt, decrypt } = require('../../helpers/cryptography');

router.put('/:username', async (req, res) => {
    try {    
        const users = getDb().collection('users');
        const user = await users.findOne({ _id: req.params.username }, { projection: { email: 1 } });
        if (!user) throw 404; // Incorrect username
        
        // Creating JWT with username and password, signing it with the RESET_KEY
        const token = jwt.sign(
            { username: user._id, password: req.body.password }, 
            process.env.RESET_KEY, { expiresIn: "10m" }
        );
            
        const id = encodeURIComponent(encrypt(token));

        let transport = nodemailer.createTransport({
            host: "smtp.zoho.in",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        const url = req.protocol + '://' + req.get('host');
        var mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset',
            text: 
                'Here\'s the link to reset your password:\n' + 
                url + '/forgot-password?id=' + id +
                '\n\nThe password will be reset to the one you provided to send the email.' +
                '\nThe link is valid only for 10 minutes.'
        };

        transport.sendMail(mailOptions);

        res.status(200).send("An email with the reset link has been sent to your email id");
    } catch (e) {
        let code = 500, message = e.message;
        if (e == 404) { code = e, message = "User not found" }
        res.status(code).send(message);
    }
});

router.get('/', async (req, res) => {
    try {
        const users = getDb().collection('users');

        const token = decrypt(decodeURIComponent(req.query.id));
        const decoded = jwt.verify(token, process.env.RESET_KEY);

        await users.updateOne({ _id: decoded.username },{
            $set: { password: await bcrypt.hash(decoded.password, 10) }
        });

        res.status(200).send("Password successfully reset")
    } catch (e) {
        message = "The link is broken";
        if (e.name == "TokenExpiredError") { message = "The link has expired" }
        res.status(401).send(message);
    }
});

module.exports = router;
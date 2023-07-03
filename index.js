const { MongoClient } = require('mongodb');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
var nodemailer = require('nodemailer');
const app = express();
app.use(cors());
app.use(express.json());

let collection;
const ConnectMongo = async () => {
    let mongoClient, db;
    let uri = "mongodb+srv://bitorsic:ZflNK6PFtJlKMMBK@cluster0.kb3evhs.mongodb.net/?retryWrites=true&w=majority";
    try {
        mongoClient = new MongoClient(uri);
        console.log('Connecting to MongoDB Atlas cluster...');
        await mongoClient.connect();
        db = mongoClient.db('banao');
        collection = db.collection('users');
        console.log('Successfully connected to MongoDB Atlas!');
    } catch (error) {
        console.error('Connection to MongoDB Atlas failed!', error);
        process.exit();
    }
};
ConnectMongo();

app.post('/register', async (req, res) => {
    try {
        const user = {
            email: req.body.email,
            password: await bcrypt.hash(req.body.password, 10),
            _id: req.body.username,
            otp: "000000"
        };

        await collection.insertOne(user);

        res.status(201).send({
            success: true,
            msg: "Registration Successful"
        })
    } catch (e) {
        let code = 500, message = e;
        if (e.code == 11000) { code = 409; message = "Username already in use" }
        res.status(code).send({ success: false, msg: message });
    }
})

app.post('/login', async (req, res) => {
    try {
        const user = await collection.findOne({ _id: req.body.username });

        if (user == null) throw 400;

        if (await bcrypt.compare(req.body.password, user.password)) {
            res.send({
                success: true,
                msg: "Logged in as " + user._id
            })
        } else { throw 403 }
    } catch (e) {
        let code = 500, message = e;
        if (e == 400) { code = e, message = "User not found" }
        if (e == 403) { code = e, message = "Incorrect password" }
        res.status(code).send({ success: false, msg: message });
    }
})

app.get('/forgot-password', async (req, res) => {
    try {
        const user = await collection.findOne({ _id: req.query.username });
        const otp = Math.floor(100000 + Math.random() * 900000);

        if (user == null) throw 403;

        let transport = nodemailer.createTransport({
            host: "sandbox.smtp.mailtrap.io",
            port: 2525,
            auth: {
                user: "1935aa5bec508b",
                pass: "81307a95f0579b"
            }
        });

        var mailOptions = {
            to: user.email,
            subject: 'Your OTP',
            text: 'Your OTP to log in is: ' + otp
        };

        await collection.updateOne({ _id: req.query.username }, { $set: { otp: otp } })

        transport.sendMail(mailOptions);

        res.send({ msg: "The OTP has been sent to your email" })
    } catch (e) {
        console.log(e);
        let code = 500, message = e;
        if (e == 403) { code = e, message = "The username does not exist" }
        res.status(code).send({ success: false, msg: message });
    }
})

app.put('/forgot-password', async (req, res) => {
    try {
        const user = await collection.findOne({ _id: req.query.username });
        if (user == null) throw 403;
        if (req.query.otp != user.otp) throw 401;

        await collection.updateOne({ _id: req.query.username },
            { $set: { 
                password: await bcrypt.hash(req.body.password, 10),
                otp: "000000"
            }}
        )

        res.send({ msg: "The password has been reset for the user " + user._id })
    } catch (e) {
        let code = 500, message = e;
        if (e == 403) { code = e, message = "The username does not exist" }
        if (e == 401) { code = e, message = "The OTP is incorrect" }
        res.status(code).send({ success: false, msg: message });
    }
})

app.listen(3000, () => {
    console.log('Server running on port 3000')
})
const { MongoClient } = require('mongodb');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
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
            username: req.body.username
        };

        await collection.insertOne(user);

        res.status(201).send({
            success: true,
            msg: "Registration Successful"
        })
    } catch (e) { 
        console.log(e);
        res.status(500).send({ success: false, msg: e })
    }
})

app.post('/login', async (req, res) => {
    try {
        const user = await collection.findOne({ username: req.body.username });

        if (user == null) throw 400;

        if (await bcrypt.compare(req.body.password, user.password)) {
            res.send({ 
                success: true,
                msg: "Logged in as " + user.username
            })
        } else { throw 403 }
    } catch (e) {
        let code = 500, message = e;
        if(e == 400) { code = e, message = "User not found" }
        if(e == 403) { code = e, message = "Incorrect password" }
        res.status(code).send({ success: false, msg: message });
    }
})

app.listen(3000, () => {
    console.log('Server running on port 3000')
})
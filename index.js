const { MongoClient } = require('mongodb');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
var nodemailer = require('nodemailer');
const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

let users, posts, comments;
const ConnectMongo = async () => {
    let mongoClient, db;
    let uri = "mongodb+srv://bitorsic:ZflNK6PFtJlKMMBK@cluster0.kb3evhs.mongodb.net/?retryWrites=true&w=majority";
    try {
        mongoClient = new MongoClient(uri);
        console.log('Connecting to MongoDB Atlas cluster...');
        await mongoClient.connect();
        db = mongoClient.db('banao');
        users = db.collection('users');
        posts = db.collection('posts');
        comments = db.collection('comments');
        console.log('Successfully connected to MongoDB Atlas!');
    } catch (error) {
        console.error('Connection to MongoDB Atlas failed!', error);
        process.exit();
    }
};
ConnectMongo();

// Register Endpoint //
app.post('/register', async (req, res) => {
    try {
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

        res.status(201).send({ msg: "Registration Successful" })
    } catch (e) {
        let code = 500, message = e;
        if (e.code == 11000) { code = 409; message = "Username already in use" }
        res.status(code).send({ msg: message });
    }
})

// Login Endpoint //
app.post('/login', async (req, res) => {
    try {
        const user = await users.findOne({ _id: req.body.username });

        if (user == null) throw 400;

        if (await bcrypt.compare(req.body.password, user.password)) {
            res.cookie(`username`, user._id)
            res.send({ msg: "Logged in as " + user._id });
        } else { throw 403 }
    } catch (e) {
        let code = 500, message = e;
        if (e == 400) { code = e, message = "User not found" }
        if (e == 403) { code = e, message = "Incorrect password" }
        res.status(code).send({ msg: message });
    }
})

// Forgot Password //
app.get('/forgot-password', async (req, res) => {
    try {
        const user = await users.findOne({ _id: req.query.username });
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

        await users.updateOne({ _id: req.query.username }, { $set: { otp: otp } });

        transport.sendMail(mailOptions);

        res.send({ msg: "The OTP has been sent to your email" });
    } catch (e) {
        console.log(e);
        let code = 500, message = e;
        if (e == 403) { code = e, message = "The username does not exist" }
        res.status(code).send({ msg: message });
    }
})

app.put('/forgot-password', async (req, res) => {
    try {
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

        res.send({ msg: "The password has been reset for the user " + user._id })
    } catch (e) {
        let code = 500, message = e;
        if (e == 403) { code = e, message = "The username does not exist" }
        if (e == 401) { code = e, message = "The OTP is incorrect" }
        res.status(code).send({ msg: message });
    }
})

// Post Endpoint //
app.post('/post', async (req, res) => {
    try {
        if (req.cookies.username == undefined) throw 401;

        let postId;
        let post = await posts.findOne();
        if (post == null) await posts.insertOne({ _id: 0, postId: 1 });
        postId = post.postId

        post = {
            _id: postId,
            by: req.cookies.username,
            content: req.body.content,
            edited: false,
            likes: [],
            comments: []
        };

        await posts.insertOne(post);

        await posts.updateOne(
            { _id: 0 },
            { $inc: { postId: 1 } }
        );

        await users.updateOne(
            { _id: post.by },
            { $push: { posts: post._id } }
        );
        
        res.status(201).send("Post created with id = " + post._id);
    } catch (e) {
        let code = 500, message = e;
        if (e == 401) { code = e, message = "Not logged in" }
        res.status(code).send({ msg: message });
    }
});

app.get('/post', async (req, res) => {
    try {
        let data;
        if (req.query.user == undefined) {
            data = await posts.find({}).toArray();
            data.shift();
        } else {
            data = await posts.find({ by: req.query.user }).toArray();
        }

        if (data.length == 0) throw 404;

        for (let i=0;i<data.length;i++) {
            for (let j=0;j<data[i].comments.length;j++) {
                const comment = await comments.findOne({ _id: data[i].comments[0] });
                data[i].comments.push([comment.by, comment.content]);
                data[i].comments.shift();
            }
        }

        res.send(data);
    } catch (e) {
        let code = 500, message = e;
        if (e == 404) { code = e, message = "No posts found" }
        res.status(code).send({ msg: message });
    }
});

app.put('/post', async (req, res) => {
    try {
        const post = await posts.findOne({ _id: Number(req.query.postId) });
        
        if (post == null) throw 404;
        if (post.by != req.cookies.username) throw 401;

        await posts.updateOne(
            { _id: post._id },
            { $set: { content: req.body.content, edited: true } }
        );

        res.send({msg: "Post with id = " + post._id + " edited"});
    } catch (e) {
        let code = 500, message = e;
        if (e == 404) { code = e, message = "Post with given id not found" }
        if (e == 401) { code = e, message = "Post does not belong to the user" }
        res.status(code).send({ msg: message });
    }
});

app.delete('/post', async (req, res) => {
    try {
        const post = await posts.findOne({ _id: Number(req.query.postId) });
        
        if (post == null) throw 404;
        if (post.by != req.cookies.username) throw 401;

        await posts.deleteOne({ _id: post._id });
        await users.updateOne({ _id: post.by }, {$pull: { posts: post._id }});
        
        for (let i=0;i<post.likes.length;i++) {
            await users.updateOne({ _id: post.likes[i] }, { $pull: { likes: post._id } });
        }

        for (let i=0;i<post.comments.length;i++) {
            const comment = await comments.findOne({ _id: post.comments[i] });
            await comments.deleteOne({ _id: comment._id });
            await users.updateOne({ _id: comment.by }, { $pull: { comments: comment._id } });
        }

        res.send({msg: "Post with id = " + post._id + " deleted"});
    } catch (e) {
        let code = 500, message = e;
        if (e == 404) { code = e, message = "Post with given id not found" }
        if (e == 401) { code = e, message = "Post does not belong to the user" }
        res.status(code).send({ msg: message });
    }
});

// Like Endpoint //
app.put('/like', async (req, res) => {
    try {
        if (req.cookies.username == undefined) throw 401;
        
        let action;
        const post = await posts.findOne({ _id: Number(req.query.postId) });       
        if (post == null) throw 404;

        if (post.likes.includes(req.cookies.username)) {
            await posts.updateOne(
                { _id: post._id },
                { $pull: { likes: req.cookies.username } }
            );

            await users.updateOne(
                { _id: req.cookies.username },
                { $pull: { likes: post._id } }
            );

            action = " unliked by ";
        } else {
            await posts.updateOne(
                { _id: post._id },
                { $push: { likes: req.cookies.username } }
            );

            await users.updateOne(
                { _id: req.cookies.username },
                { $push: { likes: post._id } }
            );

            action = " liked by ";
        }

        res.send({msg: "Post with id = " + post._id + action + req.cookies.username});
    } catch (e) {
        let code = 500, message = e;
        if (e == 401) { code = e, message = "Not logged in" }
        if (e == 404) { code = e, message = "Post with given id not found" }
        res.status(code).send({ msg: message });
    }
});

// Comment Endpoint //
app.post('/comment', async (req, res) => {
    try {
        if (req.cookies.username == undefined) throw 401;

        const post = await posts.findOne({ _id: Number(req.body.postId) });
        if (post == null) throw 404;

        let commentId;
        let comment = await comments.findOne();
        if (comment == null) await comments.insertOne({ _id: 0, commentId: 1 })
        commentId = comment.commentId

        comment = {
            _id: commentId,
            by: req.cookies.username,
            on: post._id,
            content: req.body.content
        };

        await comments.insertOne(comment);
        await comments.updateOne( { _id: 0 }, { $inc: { commentId: 1 } });

        await posts.updateOne({ _id: post._id }, { $push: { comments: comment._id } });
        await users.updateOne({ _id: comment.by }, { $push: { comments: comment._id } });
        
        res.status(201).send("Commented on post with id = " + post._id);
    } catch (e) {
        let code = 500, message = e;
        if (e == 401) { code = e, message = "Not logged in" }
        if (e == 404) { code = e, message = "Post with given id not found" }
        res.status(code).send({ msg: message });
    }
});

app.delete('/comment', async (req, res) => {
    try {
        const comment = await comments.findOne({ _id: Number(req.query.commentId) });
        if (comment == null) throw 404;
        
        const post = await posts.findOne({ _id: comment.on });

        if (req.cookies.username != post.by && req.cookies.username != comment.by) throw 401;

        await comments.deleteOne({ _id: comment._id });
        await posts.updateOne( { _id: post._id }, {$pull: {comments: comment._id}});
        await users.updateOne( { _id: comment.by }, {$pull: {comments: comment._id}});

        res.send({msg: "Post with id = " + post._id + " deleted"});
    } catch (e) {
        let code = 500, message = e;
        if (e == 404) { code = e, message = "Comment with given id not found" }
        if (e == 401) { code = e, message = "The user is not permitted to delete the comment" }
        res.status(code).send({ msg: message });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000')
})
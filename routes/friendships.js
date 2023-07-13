const express = require('express');
const router = express.Router();
const { getDb } = require('../mongoUtil');
const auth = require('../auth');

router.put('/', auth, async (req, res) => {
    try {
        if (req.user.username == req.query.username) throw 403;

        const users = getDb().collection('users');
        const user = await users.findOne({ _id: req.query.username }, { projection: { _id: 1, friends: 1 } });
        if (!user) throw 404;
        if (user.friends.includes(req.user.username)) throw 409;
        
        const friend_requests = getDb().collection('friend_requests');
        let reqObj = { _id: { from: user._id, to: req.user.username } };
        const fReq = await friend_requests.findOne(reqObj);
        let message;

        if (!fReq) {
            reqObj = { _id: { from: req.user.username, to: user._id } };
            await friend_requests.insertOne(reqObj);
            message = "Friend request sent to " + user._id;
        } else {
            await users.updateOne({ _id: fReq._id.from }, { $push: { friends: fReq._id.to } });
            await users.updateOne({ _id: fReq._id.to }, { $push: { friends: fReq._id.from } });
            await friend_requests.deleteOne(fReq);
            message = "You are now friends with " + fReq._id.from;
        }

        res.status(200).send(message);
    } catch (e) {
        let code = 500, message = e;
        if (e == 403) { code = e, message = "Cannot send a friend request to self" }
        if (e == 404) { code = e, message = "The username does not exist" }
        if (e.code == 11000) { code = 409; message = "Friend request already sent" }
        if (e == 409) { code = e, message = "User already in your friend list" }
        res.status(code).send(message);
    }
});

router.delete('/', auth, async (req, res) => {
    try {
        const users = getDb().collection('users');
        const user = await users.findOne({ _id: req.query.username }, { projection: { _id: 1, friends: 1 } });
        if (!user) throw 404;

        const friend_requests = getDb().collection('friend_requests');
        let reqObj = { _id: { from: user._id, to: req.user.username } };
        const fReq = await friend_requests.findOne(reqObj);

        let message;
        if (user.friends.includes(req.user.username)) {
            await users.updateOne(user, { $pull: { friends: req.user.username } });
            await users.updateOne({ _id: req.user.username }, { $pull: { friends: user._id } });
            message = user._id + " removed from friends";
        } else if (!fReq) throw 409;
        else {
            friend_requests.deleteOne(fReq);
            message = "Friend request from " + fReq._id.from + " declined";
        }
        res.status(200).send(message);
    } catch (e) {
        let code = 500, message = e;
        if (e == 404) { code = e, message = "The username does not exist" }
        if (e == 409) { code = e, message = "User not in your friend list and no pending request to you from user" }
        res.status(code).send(message);
    }
});

router.get('/', auth, async (req, res) => {
    try {
        let response = [];

        if (req.query.requests) {
            const friend_requests = getDb().collection('friend_requests');
            const fReqs = await friend_requests.find({ '_id.to': req.user.username }).toArray();

            for (let i=0;i<fReqs.length;i++) {
                response.push(fReqs[i]._id.from);
            }
        } else {
            const users = getDb().collection('users');
            let user = await users.findOne({ _id: req.user.username }, { projection: { friends: 1, _id: 0 }});
            
            if (!req.query.username) response = user.friends;
            else if (user.friends.includes(req.query.username)) {
                user = await users.findOne({ _id: req.query.username }, { projection: { friends: 1, _id: 0 }});
                response = user.friends;
            } else throw 403;
        }

        res.status(200).send(response);
    } catch (e) {
        let code = 500, message = e;
        if (e == 403) { code = e, message = "User not in your friend list" }
        res.status(code).send(message);
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { getDb } = require('../mongoUtil');
const auth = require('../auth');

router.put('/:username', auth, async (req, res) => {
    try {
        if (req.user.username == req.params.username) throw 403;

        const users = getDb().collection('users');
        const user = await users.findOne({ _id: req.params.username }, { projection: { _id: 1, friends: 1 } });
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

router.delete('/:username', auth, async (req, res) => {
    try {
        const users = getDb().collection('users');
        const user = await users.findOne({ _id: req.params.username }, { projection: { _id: 1, friends: 1 } });
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

router.get('/requests', auth, async (req, res) => {
    try {
        const friend_requests = getDb().collection('friend_requests');
        const fReqs = await friend_requests.find({ '_id.to': req.user.username }).toArray();
        if (fReqs.length == 0) throw 404;

        for (let i=0;i<fReqs.length;i++) {
            fReqs[i] = fReqs[i]._id.from;
        }

        res.status(200).send(fReqs);
    } catch (e) {
        let code = 500, message = e;
        if (e == 404) { code = e, message = "No pending friend requests" }
        res.status(code).send(message);
    }
});

router.get('/:username', auth, async (req, res) => {
    try {
        const users = getDb().collection('users');
        let user = await users.findOne({ _id: req.user.username }, { projection: { friends: 1 }});

        if (req.params.username != user._id) {
            if (!(user.friends.includes(req.params.username))) throw 403;
            user = await users.findOne({ _id: req.params.username }, { projection: { friends: 1, _id: 0 }});
        }
        
        if (user.friends.length == 0) throw 404;
        res.status(200).send(user.friends);            
    } catch (e) {
        let code = 500, message = e;
        if (e == 403) { code = e, message = "User is not in your friend list" }
        if (e == 404) { code = e, message = "Your friend list is empty" }
        res.status(code).send(message);
    }
});

module.exports = router;
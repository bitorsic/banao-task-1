const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    let token = req.headers.authorization;

    if (!token) return res.status(403).send("Not logged in");
    
    try {
        token = token.split(' ')[1];
        const decoded = jwt.verify(token, process.env.LOGIN_KEY);
        req.user = decoded;
    } catch (err) {
        return res.status(401).send("Invalid Token");
    }
    return next();
};

module.exports = verifyToken;
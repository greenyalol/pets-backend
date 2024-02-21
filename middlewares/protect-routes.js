const jwt = require('jsonwebtoken');

function verifyUser(req, res, next) {
    const { token } = req.cookies; //middleware
    if (!token) {
        res.send(403).json({ message: 'Access denied' });
    } else {
        try {
            const decoded = jwt.verify(token, process.env.PRIVATE_KEY);
            req.uid = decoded.user_id;
            //get user roleF
            next();
        } catch (err) {
            res.send(403).json({ message: 'Access denied' });
        }
    }
}

module.exports = {
    verifyUser
};
//verify user

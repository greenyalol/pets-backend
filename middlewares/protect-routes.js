const jwt = require('jsonwebtoken');
const { getUserRoles } = require('../services/db_services');

function verifyUser(req, res, next) {
    const { token } = req.cookies; //middleware
    if (!token) {
        res.status(403).json({ error: 'Access denied' });
    } else {
        try {
            const decoded = jwt.verify(token, process.env.PRIVATE_KEY);
            req.uid = decoded.user_id;
            //get user roleF
            next();
        } catch (err) {
            //res.send(403).json({ error: 'Access denied' });
        }
    }
}

async function hasAdminRole(req, res, next) {
    const { uid } = req;
    try {
        const userRoles = await getUserRoles(uid);
        console.log(userRoles);
        if (userRoles.some((user) => user.slug === 'admin')) {
            next();
        } else {
            res.status(403).json({ error: 'Access denied' });
            return;
        }
    } catch (err) {
        // res.send(500).json({ error: 'Internal server error' });
    }

}

module.exports = {
    verifyUser, hasAdminRole
};
//verify user

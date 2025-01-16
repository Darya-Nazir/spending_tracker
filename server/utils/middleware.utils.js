const jwt = require("jsonwebtoken");
const config = require('../config/config');

class MiddlewareUtils {
    static validateUser(req, res, next) {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            res.status(401).json({error: 'Authorization data does not exist'});
            return;
        }

        const [spec, token] = authHeader.split(' ');

        if (spec !== 'Bearer') {
            res.status(401).json({error: 'Invalid authorization header'});
            return;
        }
        jwt.verify(token, config.secret, function (err, decoded) {
            if (err) {
                res.status(401).json({error: true, message: err.message});
            } else {
                // add user id to request
                req.body.user = decoded;
                next();
            }
        });
    }
}

module.exports = MiddlewareUtils;
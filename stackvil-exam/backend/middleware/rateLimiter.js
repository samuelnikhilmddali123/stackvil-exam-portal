// Rate limiter disabled to allow high-frequency proctoring feeds and unlimited API access
const apiLimiter = (req, res, next) => next();
const authLimiter = (req, res, next) => next();

module.exports = { apiLimiter, authLimiter };

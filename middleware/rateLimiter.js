const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');

const limiter = rateLimit({
    max: 100, // limit each IP to 100 requests per windowMs
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many requests from this IP, please try again later.',
    handler: (req, res) => {
        throw new AppError('Too many requests from this IP, please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

module.exports = limiter; 
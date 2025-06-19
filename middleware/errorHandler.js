const AppError = require('../utils/AppError');

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400, 'INVALID_DATA');
};

const handleDuplicateFieldsDB = err => {
    const value = err.keyValue[Object.keys(err.keyValue)[0]];
    const message = `Duplicate field value: ${value}. Please use another value.`;
    return new AppError(message, 400, 'DUPLICATE_FIELD');
};

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400, 'VALIDATION_ERROR');
};

const handleJWTError = () =>
    new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');

const handleJWTExpiredError = () =>
    new AppError('Your token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');

const sendErrorDev = (err, req, res) => {
    // Log error for debugging
    console.error('ERROR 💥', err);

    return res.status(err.statusCode).json({
        status: err.status,
        error: {
            message: err.message,
            code: err.errorCode,
            stack: err.stack,
            details: err
        }
    });
};

const sendErrorProd = (err, req, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: err.status,
            error: {
                message: err.message,
                code: err.errorCode
            }
        });
    }
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    return res.status(500).json({
        status: 'error',
        error: {
            message: 'Something went wrong!',
            code: 'INTERNAL_ERROR'
        }
    });
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else {
        let error = { ...err };
        error.message = err.message;
        error.name = err.name;

        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, req, res);
    }
}; 
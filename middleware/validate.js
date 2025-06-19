const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

const validate = validations => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        // Format validation errors
        const formattedErrors = errors.array().map(err => ({
            field: err.param,
            message: err.msg,
            value: err.value
        }));

        // Throw custom error with validation details
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
            errors: formattedErrors
        });
    };
};

module.exports = validate; 
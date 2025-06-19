require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const validate = require('./middleware/validate');
const AppError = require('./utils/AppError');

const app = express();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false
}));

// Enable CORS for your static site domain
app.use(cors({
    origin: ['https://preciseksa.co', 'http://localhost:3000', 'file:///C:/Users/pubgh/Desktop/PRECISE/public/index.html'], // Add your static site domain here
    methods: ['POST'],
    allowedHeaders: ['Content-Type', 'Accept']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // limit each IP to 5 requests per windowMs
});

app.use(express.json({
    limit: '10kb' // Limit body size
}));

app.use('/api/subscribe', limiter);

// Serve static files from the public directory
app.use(express.static('public'));

// Serve index.html for the root route
app.get('/', (req, res) => {
    console.log('Attempting to serve index.html');
    res.sendFile('index.html', { root: './public' });
});

// MongoDB Connection with advanced error handling
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit process with failure
});

// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
    throw new AppError('Database connection error', 500, 'DB_CONNECTION_ERROR');
});

mongoose.connection.on('disconnected', () => {
    console.error('MongoDB disconnected. Attempting to reconnect...');
});

// Email subscription schema
const subscriptionSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

// Subscription endpoint
app.post('/api/subscribe',
    body('email').isEmail().normalizeEmail(),
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new AppError('Invalid email address', 400);
            }

            const { email } = req.body;

            // Check if email already exists
            const existingSubscription = await Subscription.findOne({ email });
            if (existingSubscription) {
                throw new AppError('Email already subscribed', 400);
            }

            // Save new subscription
            await Subscription.create({ email });

            res.status(201).json({
                status: 'success',
                message: 'Successfully subscribed!'
            });
        } catch (error) {
            next(error);
        }
    }
);

// Health check endpoint
app.get('/api/health', (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now()
    };
    try {
        res.status(200).json(healthcheck);
    } catch (error) {
        healthcheck.message = error;
        res.status(503).json(healthcheck);
    }
});

// Handle undefined routes
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'ROUTE_NOT_FOUND'));
});

// Global error handling middleware
app.use(errorHandler);

// Handle uncaught exceptions
process.on('uncaughtException', err => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message, err.stack);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', err => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message, err.stack);
    server.close(() => {
        process.exit(1);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        console.log('💥 Process terminated!');
        mongoose.connection.close(false, () => {
            process.exit(0);
        });
    });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 
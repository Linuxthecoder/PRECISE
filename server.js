const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Initialize Express app
const app = express();

// Enable CORS for specific origins
app.use(cors({
    origin: ['https://www.preciseksa.co', 'https://preciseksa.co', 'http://localhost:3000', 'https://ksa-77f3.onrender.com'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: false // Set to true if you need to handle cookies or auth headers
}));

// Middleware to parse JSON
app.use(express.json());

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased limit for testing; adjust as needed
    message: {
        status: 'error',
        message: 'Too many requests, please try again later.'
    }
});

// Apply rate limiter to subscription endpoint
app.use('/subscribe', limiter);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000 // Timeout for server selection
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Email subscription schema
const subscriptionSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

// Root GET endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Precise KSA API is running'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Subscription endpoint with validation
app.post('/subscribe', [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email address')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: errors.array()[0].msg
            });
        }

        const { email } = req.body;

        // Check if email already exists
        const existingSubscription = await Subscription.findOne({ email });
        if (existingSubscription) {
            return res.status(400).json({
                status: 'error',
                message: 'Email already subscribed'
            });
        }

        // Save new subscription
        await Subscription.create({ email });

        res.status(201).json({
            status: 'success',
            message: 'Successfully subscribed!'
        });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({
            status: 'error',
            message: 'An error occurred while processing your subscription'
        });
    }
});

// Handle undefined routes
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found'
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'An unexpected error occurred'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

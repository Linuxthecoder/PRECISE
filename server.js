const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const AppError = require('./utils/AppError');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Enable CORS for your static site domain
app.use(cors({
    origin: ['https://preciseksa.co', 'http://localhost:3000', 'https://ksa-77f3.onrender.com'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Accept']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // limit each IP to 5 requests per windowMs
});

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

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

// Root GET endpoint - just to show the API is working
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Precise KSA API is running'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Apply rate limiting to subscription endpoint
app.use('/subscribe', limiter);

// Subscription endpoint
app.post('/subscribe',
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

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

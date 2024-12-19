const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS for production
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://mocktrade.onrender.com']
        : 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.static('.'));
app.use(express.json());

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// In-memory user storage (replace with a database in production)
const users = new Map();

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        console.log('Signup attempt:', { name, email }); // Debug log

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user already exists
        if (users.has(email)) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Store user
        users.set(email, {
            name,
            email,
            password: hashedPassword
        });

        console.log('User created:', email); // Debug log

        // Create and send token
        const token = jwt.sign({ email }, JWT_SECRET);
        res.json({ token, name, email });
    } catch (error) {
        console.error('Error in signup:', error);
        res.status(500).json({ error: 'Server error during signup' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', email); // Debug log

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user exists
        const user = users.get(email);
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        // Validate password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        console.log('Login successful:', email); // Debug log

        // Create and send token
        const token = jwt.sign({ email }, JWT_SECRET);
        res.json({ token, name: user.name, email });
    } catch (error) {
        console.error('Error in login:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// List of Indian stocks we want to track
const STOCK_LIST = [
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.' },
    { symbol: 'TCS', name: 'Tata Consultancy Services Ltd.' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.' },
    { symbol: 'INFY', name: 'Infosys Ltd.' },
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd.' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.' },
    { symbol: 'SBIN', name: 'State Bank of India' },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.' },
    { symbol: 'WIPRO', name: 'Wipro Ltd.' },
    { symbol: 'LT', name: 'Larsen & Toubro Ltd.' }
];

// Generate realistic mock data
function generateMockData() {
    const baseValues = {
        'RELIANCE': 2500,
        'TCS': 3700,
        'HDFCBANK': 1650,
        'INFY': 1500,
        'HINDUNILVR': 2600,
        'ICICIBANK': 1000,
        'SBIN': 600,
        'BHARTIARTL': 900,
        'WIPRO': 450,
        'LT': 3000
    };

    return STOCK_LIST.map(stock => {
        const basePrice = baseValues[stock.symbol];
        const randomChange = (Math.random() - 0.5) * (basePrice * 0.02); // 2% max change
        const price = basePrice + randomChange;
        const changePercent = (randomChange / basePrice) * 100;

        return {
            symbol: stock.symbol,
            name: stock.name,
            price: price,
            change: randomChange,
            changePercent: changePercent,
            volume: Math.floor(Math.random() * 1000000) + 500000,
            previousClose: basePrice,
            dayHigh: price + Math.abs(randomChange),
            dayLow: price - Math.abs(randomChange)
        };
    });
}

// Generate realistic market index data
function generateMarketData() {
    const points = 50;
    const timestamps = [];
    const prices = [];
    
    // Generate data points for the last 50 minutes
    for (let i = points - 1; i >= 0; i--) {
        const date = new Date();
        date.setMinutes(date.getMinutes() - i);
        timestamps.push(date.toISOString());
    }
    
    // Generate realistic price movements
    let lastPrice = 19500; // Base NIFTY price
    prices.push(lastPrice);
    
    for (let i = 1; i < points; i++) {
        const change = (Math.random() - 0.5) * 20; // Max 20 points change
        lastPrice += change;
        prices.push(lastPrice);
    }
    
    return { timestamps, prices };
}

// Cache mechanism
let stocksCache = {
    data: null,
    lastUpdated: null
};

let marketCache = {
    nifty: null,
    sensex: null,
    lastUpdated: null
};

// API endpoint to get stock data
app.get('/api/stocks', authenticateToken, (req, res) => {
    try {
        const now = Date.now();
        
        // Update cache every minute
        if (!stocksCache.data || !stocksCache.lastUpdated || (now - stocksCache.lastUpdated) > 60000) {
            stocksCache.data = generateMockData();
            stocksCache.lastUpdated = now;
        }
        
        res.json(stocksCache.data);
    } catch (error) {
        console.error('Error fetching stock data:', error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// API endpoint to get NIFTY 50 data
app.get('/api/nifty50', authenticateToken, (req, res) => {
    try {
        const now = Date.now();
        
        // Update cache every 5 minutes
        if (!marketCache.nifty || !marketCache.lastUpdated || (now - marketCache.lastUpdated) > 300000) {
            const data = generateMarketData();
            marketCache.nifty = {
                timestamps: data.timestamps,
                prices: data.prices.map(p => p)
            };
            marketCache.sensex = {
                timestamps: data.timestamps,
                prices: data.prices.map(p => p * 3.3) // Approximate SENSEX/NIFTY ratio
            };
            marketCache.lastUpdated = now;
        }
        
        res.json(marketCache.nifty);
    } catch (error) {
        console.error('Error fetching NIFTY data:', error);
        res.status(500).json({ error: 'Failed to fetch NIFTY data' });
    }
});

// API endpoint to get SENSEX data
app.get('/api/sensex', authenticateToken, (req, res) => {
    try {
        const now = Date.now();
        
        // Update cache every 5 minutes
        if (!marketCache.sensex || !marketCache.lastUpdated || (now - marketCache.lastUpdated) > 300000) {
            const data = generateMarketData();
            marketCache.nifty = {
                timestamps: data.timestamps,
                prices: data.prices.map(p => p)
            };
            marketCache.sensex = {
                timestamps: data.timestamps,
                prices: data.prices.map(p => p * 3.3)
            };
            marketCache.lastUpdated = now;
        }
        
        res.json(marketCache.sensex);
    } catch (error) {
        console.error('Error fetching SENSEX data:', error);
        res.status(500).json({ error: 'Failed to fetch SENSEX data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

const express = require('express');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Security: Helmet for secure HTTP headers & CSP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'", "https://maps.googleapis.com", "https://cdnjs.cloudflare.com", "https://*.gstatic.com"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://maps.googleapis.com"],
            "img-src": ["'self'", "data:", "blob:", "https://maps.gstatic.com", "https://*.googleapis.com", "https://*.ggpht.com", "https://*.googleusercontent.com", "https://*.google.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
            "connect-src": ["'self'", "https://maps.googleapis.com", "https://*.googleapis.com", "https://cdnjs.cloudflare.com"],
            "frame-src": ["'self'", "https://www.google.com"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
}));

// Security: CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? [/\.onrender\.com$/, /\.vercel\.app$/] 
        : ['http://localhost:3000', 'http://localhost:8080']
}));

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, 
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, 
    legacyHeaders: false, 
});
app.use(limiter);

// Serve js/app.js with API key replacement
app.get('/js/app.js', (req, res) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    let jsContent = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
    const finalJs = jsContent.replace(/%GOOGLE_MAPS_API_KEY%/g, apiKey || 'MISSING_API_KEY');
    res.set('Content-Type', 'application/javascript');
    res.send(finalJs);
});

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Serve index.html with API key replacement
app.get('/', (req, res) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const finalHtml = html.replace(/%GOOGLE_MAPS_API_KEY%/g, apiKey || 'MISSING_API_KEY');
    res.send(finalHtml);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`\n🚀 MeetWay running at http://0.0.0.0:${port}`);
});

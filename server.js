const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Serve js/app.js with API key replacement
app.get('/js/app.js', (req, res) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    let jsContent = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
    
    // Replace the placeholder in the dynamic loader
    const finalJs = jsContent.replace(/%GOOGLE_MAPS_API_KEY%/g, apiKey || 'MISSING_API_KEY');
    
    res.set('Content-Type', 'application/javascript');
    res.send(finalJs);
});

// Serve static files (CSS, JS) - JS is now handled above for app.js
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Serve index.html with API key replacement
app.get('/', (req, res) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
        console.error('❌ DEPLOYMENT ERROR: GOOGLE_MAPS_API_KEY environment variable is missing!');
    }

    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
    // Global replace in case of multiple script tags or metadata
    const finalHtml = html.replace(/%GOOGLE_MAPS_API_KEY%/g, apiKey || 'MISSING_API_KEY');
    
    res.send(finalHtml);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`\n🚀 MeetWay running at http://0.0.0.0:${port}`);
    console.log(`Using API Key: ${process.env.GOOGLE_MAPS_API_KEY ? '✅ Found in environment' : '❌ Not found'}\n`);
});

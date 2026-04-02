const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

// Serve static files (CSS, JS)
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Serve index.html with API key replacement
app.get('/', (req, res) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
    // Replace the placeholder with the actual API key from .env
    html = html.replace('%GOOGLE_MAPS_API_KEY%', apiKey);
    
    res.send(html);
});

app.listen(port, () => {
    console.log(`\n🚀 MeetWay running at http://localhost:${port}`);
    console.log(`Using API Key: ${process.env.GOOGLE_MAPS_API_KEY ? '✅ Found in .env' : '❌ Not found, using placeholder'}\n`);
});

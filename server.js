const express = require('express');
const path = require('path');
const adminRouter = require('./js/admin');
const app = express();
const cors = require('cors');

const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://akokoschool.co.ke', 'http://akokoschool.co.ke', 'https://akoko-backend.onrender.com']
        : 'http://localhost:4000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Authorization']
};

app.use(cors(corsOptions));


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Serve admin files
app.use('/admin', express.static(path.join(__dirname, '..', 'frontend/admin')));

// Add proper MIME type handling
app.use('/js', express.static(path.join(__dirname, '..', 'frontend/js'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

app.use('/css', express.static(path.join(__dirname, '..', 'frontend/css'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Admin routes - make sure this comes after all middleware
app.use('/admin', adminRouter);

// Add route logging to see what routes are registered
console.log('Registered routes:');
adminRouter.stack.forEach(r => {
    if (r.route && r.route.path) {
        console.log(`${Object.keys(r.route.methods).join(', ').toUpperCase()} ${r.route.path}`);
    }
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).send('Something broke!');
});

// Serve main.js from the frontend directory
app.get('/main.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, '..', 'frontend/js/main.js'));
});

// Start server with error handling
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
    console.error('Failed to start server:', err);
}); 
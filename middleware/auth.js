const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // In production, use environment variable

const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        console.log('Token:', token); // Log the token
        if (!token) {
            throw new Error('Token missing');
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Decoded:', decoded); // Log the decoded payload
        req.user = decoded;
        next();
        console.log('Token received in middleware:', token);
    } catch (error) {
        console.error('Authentication error:', error.message); // Log the error
        res.status(401).json({ success: false, message: 'Please authenticate' });
    }
    
};

module.exports = { auth, JWT_SECRET }; 
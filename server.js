const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectToDatabase: connectToMongo, getDatabase: getMongoDb } = require('./js/db');
const { connectToDatabase: connectToFallback, getDatabase: getFallbackDb } = require('./js/fallback-db');
const adminRouter = require('./js/admin');

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Routes
app.use('/admin', adminRouter);

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 3000;

// Global database reference
let usingFallback = false;

// Override getDatabase to use the correct implementation
const getDatabase = () => {
  return usingFallback ? getFallbackDb() : getMongoDb();
};

// Export for admin.js
module.exports.getDatabase = getDatabase;

async function startServer() {
  try {
    // Try MongoDB first
    console.log('Attempting to connect to MongoDB...');
    try {
      await connectToMongo();
      console.log('MongoDB connected successfully');
      usingFallback = false;
    } catch (mongoErr) {
      console.error('MongoDB connection failed, using fallback database:', mongoErr);
      await connectToFallback();
      usingFallback = true;
    }
    
    // Initialize collections
    if (adminRouter.initializeCollections) {
      await adminRouter.initializeCollections();
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} using ${usingFallback ? 'fallback JSON database' : 'MongoDB'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
startServer();
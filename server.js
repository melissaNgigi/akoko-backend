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

// IMPORTANT: Use the PORT environment variable that Render sets
const PORT = process.env.PORT || 10000;

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
    // Start the server FIRST, before database connection
    // This ensures Render can detect the port binding
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
    
    // Then try to connect to the database
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
    
    console.log(`Server fully initialized using ${usingFallback ? 'fallback JSON database' : 'MongoDB'}`);
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
    
  } catch (err) {
    console.error('Failed to start server:', err);
    // Don't exit immediately - let Render restart if needed
    console.error('Server will attempt to continue running');
  }
}

// Start the server
startServer();
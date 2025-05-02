const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectToDatabase } = require('./js/db');
const adminRouter = require('./js/admin');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/admin', adminRouter);

// Export initializeCollections from admin.js
const { initializeCollections } = adminRouter;

// Initialize the database connection before starting the server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Initialize collections
    await initializeCollections();
    
    // Start the Express server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('Shutting down server...');
      process.exit(0);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
startServer();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectToDatabase } = require('./js/db');
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

// Export initializeCollections from admin.js
const { initializeCollections } = adminRouter;

// Initialize the database connection before starting the server
async function startServer() {
  try {
    // Connect to MongoDB first
    await connectToDatabase();
    console.log('Database connected, initializing collections...');
    
    // Initialize collections if needed
    if (adminRouter.initializeCollections) {
      await adminRouter.initializeCollections();
    }
    
    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    // Don't exit - let the process restart
    console.log('Will retry on next deployment...');
  }
}

// Start the server
startServer();
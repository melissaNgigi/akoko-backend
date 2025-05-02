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

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  let retries = 5;
  
  while (retries > 0) {
    try {
      // Connect to MongoDB first
      await connectToDatabase();
      console.log('Database connected, initializing collections...');
      
      // Initialize collections if needed
      if (adminRouter.initializeCollections) {
        await adminRouter.initializeCollections();
      }
      
      // Start server
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
      
      return; // Exit function on success
    } catch (err) {
      console.error(`Failed to start server (${retries} retries left):`, err);
      retries--;
      
      if (retries > 0) {
        console.log(`Retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log('All retries failed. Server will not start.');
      }
    }
  }
}

// Start the server
startServer();
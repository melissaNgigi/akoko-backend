const { MongoClient } = require('mongodb');

// Connection URL - use environment variable or fallback
const url = process.env.MONGODB_URI || 'mongodb+srv://ngigimelissa:0Qf9dlI1l2n5so2S@akoko.tyjuilm.mongodb.net/akoko';

// Connection options with proper TLS settings
const options = {
  ssl: true,
  tls: true,
  tlsAllowInvalidCertificates: true,
  useUnifiedTopology: true
};

let client = null;
let db = null;

async function connectToDatabase() {
  if (db) return db; // Return existing connection
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(url, options);
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    db = client.db('akoko');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not connected - call connectToDatabase() first');
  }
  return db;
}

module.exports = {
  connectToDatabase,
  getDatabase
};
const { MongoClient } = require('mongodb');

// MongoDB connection URL
const url = process.env.MONGODB_URI || 'mongodb+srv://ngigimelissa:0Qf9dlI1l2n5so2S@akoko.tyjuilm.mongodb.net/akoko?retryWrites=true&w=majority&appName=Akoko';
const client = new MongoClient(url);

let db;

async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        db = client.db('akoko');
        return db;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

function getDatabase() {
    if (!db) {
        throw new Error('Database not connected');
    }
    return db;
}

module.exports = {
    connectToDatabase,
    getDatabase
}; 
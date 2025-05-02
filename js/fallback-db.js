const fs = require('fs');
const path = require('path');

// Path to JSON files
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory database
let collections = {};

// Load collections from disk
function loadCollections() {
  try {
    const files = fs.readdirSync(DATA_DIR);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const name = file.replace('.json', '');
        const data = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
        collections[name] = JSON.parse(data);
      }
    });
    console.log('Loaded collections:', Object.keys(collections));
  } catch (err) {
    console.error('Error loading collections:', err);
    collections = {};
  }
}

// Save collection to disk
function saveCollection(name, data) {
  try {
    const filePath = path.join(DATA_DIR, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Error saving collection ${name}:`, err);
  }
}

// Mock MongoDB collection methods
class Collection {
  constructor(name) {
    this.name = name;
    if (!collections[name]) {
      collections[name] = [];
      saveCollection(name, []);
    }
  }

  async findOne(query = {}) {
    return collections[this.name].find(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    }) || null;
  }

  async find(query = {}) {
    return {
      toArray: async () => {
        return collections[this.name].filter(item => {
          for (const key in query) {
            if (item[key] !== query[key]) return false;
          }
          return true;
        });
      }
    };
  }

  async distinct(field) {
    const values = new Set();
    collections[this.name].forEach(item => {
      if (item[field]) values.add(item[field]);
    });
    return Array.from(values);
  }

  async insertOne(doc) {
    collections[this.name].push(doc);
    saveCollection(this.name, collections[this.name]);
    return { insertedId: doc._id || Date.now().toString() };
  }

  async insertMany(docs) {
    collections[this.name].push(...docs);
    saveCollection(this.name, collections[this.name]);
    return { insertedCount: docs.length };
  }

  async updateOne(query, update, options = {}) {
    const index = collections[this.name].findIndex(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });

    if (index === -1) {
      if (options.upsert) {
        const newDoc = { ...query };
        if (update.$set) Object.assign(newDoc, update.$set);
        collections[this.name].push(newDoc);
        saveCollection(this.name, collections[this.name]);
        return { modifiedCount: 0, upsertedCount: 1 };
      }
      return { modifiedCount: 0 };
    }

    if (update.$set) {
      Object.assign(collections[this.name][index], update.$set);
    }
    if (update.$push) {
      for (const key in update.$push) {
        if (!collections[this.name][index][key]) {
          collections[this.name][index][key] = [];
        }
        collections[this.name][index][key].push(update.$push[key]);
      }
    }
    if (update.$pull) {
      for (const key in update.$pull) {
        if (Array.isArray(collections[this.name][index][key])) {
          const pullQuery = update.$pull[key];
          collections[this.name][index][key] = collections[this.name][index][key].filter(item => {
            for (const pullKey in pullQuery) {
              if (item[pullKey] !== pullQuery[pullKey]) return true;
            }
            return false;
          });
        }
      }
    }

    saveCollection(this.name, collections[this.name]);
    return { modifiedCount: 1 };
  }

  async deleteOne(query) {
    const initialLength = collections[this.name].length;
    collections[this.name] = collections[this.name].filter(item => {
      for (const key in query) {
        if (item[key] === query[key]) return false;
      }
      return true;
    });
    saveCollection(this.name, collections[this.name]);
    return { deletedCount: initialLength - collections[this.name].length };
  }
}

// Mock MongoDB database
class Database {
  constructor() {
    loadCollections();
  }

  collection(name) {
    return new Collection(name);
  }
}

// Mock MongoDB client
let db = null;

async function connectToDatabase() {
  console.log('Using fallback JSON database');
  db = new Database();
  return db;
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
const express = require('express');
const router = express.Router();
const fs = require('fs');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const { auth, JWT_SECRET } = require('../middleware/auth');
let dbModule;

function getDatabase() {
  if (!dbModule) {
    dbModule = require('../server');
  }
  return dbModule.getDatabase();
}

// Simple file writing function
const writeFileSync = (filePath, data) => {
    try {
        console.log(`\nWriting to ${filePath}`);
        console.log(`Data to write:`, data);
        
        // Create directory if it doesn't exist
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write the file directly
        fs.writeFileSync(filePath, data);
        console.log(`Write successful`);
        
        return true;
    } catch (error) {
        console.error(`Error writing file:`, error);
        throw error;
    }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const category = req.body.category || 'gallery';
        const dir = `images/${category}`;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Check authentication status
router.get('/check-auth', auth, (req, res) => {
    res.json({ authenticated: true });
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        console.log('Received login request:', req.body);
        const { username, password } = req.body;
        
        const db = getDatabase();
        const user = await db.collection('users').findOne({ username });
        
        if (user && bcrypt.compareSync(password, user.password)) {
            console.log('Login successful');
            // Generate JWT token
            const token = jwt.sign(
                { username, isAdmin: true },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            return res.json({ success: true, token });
        }
        
        console.log('Login failed');
        res.json({ success: false });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Change credentials endpoint
router.post('/change-credentials', auth, async (req, res) => {
    try {
        const { currentPassword, newUsername, newPassword } = req.body;
        const db = getDatabase();
        
        // Verify current password matches what's in MongoDB
        const user = await db.collection('users').findOne({ username: req.user.username });
        if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
            return res.json({ 
                success: false, 
                message: 'Current password is incorrect' 
            });
        }

        // Update credentials in MongoDB
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        await db.collection('users').updateOne(
            { username: req.user.username },
            { $set: { 
                username: newUsername,
                password: hashedPassword,
                updatedAt: new Date()
            }}
        );
        
        res.json({ 
            success: true,
            message: 'Credentials updated successfully'
        });
    } catch (error) {
        console.error('Error updating credentials:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating credentials: ' + error.message 
        });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    res.json({ success: true });
});

// Initialize MongoDB collections with default data
async function initializeCollections() {
    try {
        const db = getDatabase();
        
        // Initialize users collection with default admin
        const userExists = await db.collection('users').findOne({ username: 'admin' });
        if (!userExists) {
            await db.collection('users').insertOne({
                username: 'admin',
                password: bcrypt.hashSync('admin123', 10),
                role: 'admin',
                createdAt: new Date()
            });
            console.log('Default admin user created');
        }
        
        // Initialize fees collection
        const feesExists = await db.collection('fees').findOne({});
        if (!feesExists) {
            await db.collection('fees').insertOne({
                department: 'default',
                fees: {
                    boarding_term1: 20268,
                    boarding_term2: 12160,
                    boarding_term3: 8107,
                    day_term1: 7000,
                    day_term2: 4200,
                    day_term3: 2800
                }
            });
        }

        // Initialize staff collection
        const staffExists = await db.collection('staff').findOne({});
        if (!staffExists) {
            const defaultStaff = [
                { department: 'mathematics', name: "Mr. Maurice Tuju" },
                { department: 'science', name: "Mrs. Jane Smith" },
                { department: 'languages', name: "Ms. Mary Johnson" },
                { department: 'humanities', name: "Mr. James Brown" },
                { department: 'technical', name: "Mr. Robert Wilson" },
                { department: 'boarding', name: "Mrs. Sarah Williams" },
                { department: 'games', name: "Mr. David Miller" },
                { department: 'academics', name: "Dr. Elizabeth Taylor" }
            ];
            await db.collection('staff').insertMany(defaultStaff);
        }

        // Initialize enrollment collection
        const enrollmentExists = await db.collection('enrollment').findOne({});
        if (!enrollmentExists) {
            await db.collection('enrollment').insertOne({
                years: [
                    {
                        year: "2024",
                        boys: 694,
                        girls: 600,
                        total: 1294
                    }
                ]
            });
        }

        // Initialize board members collection
        const boardMembersExists = await db.collection('board_members').findOne({});
        if (!boardMembersExists) {
            await db.collection('board_members').insertOne({
                members: []
            });
        }

        // ─── Admissions seeding ───────────────────────────────────────────────
        const admissionsExists = await db.collection('admissions').findOne({});
        if (!admissionsExists) {
            await db.collection('admissions').insertOne({
                applications: 0,
                accepted:     0,
                rejected:     0,
                pending:      0
            });
            console.log('Admissions collection initialized');
        }

        console.log('MongoDB collections initialized successfully');
    } catch (error) {
        console.error('Error initializing collections:', error);
    }
}

// Don't call initialization directly - it will be called by app.js
// Remove or comment out: initializeCollections();

// Update the public fees endpoint to match frontend expectations
router.get('/public-fees', async (req, res) => {
    try {
        const db = getDatabase();
        const fees = await db.collection('fees').findOne({ department: 'default' });
        
        if (!fees) {
            return res.status(404).json({
                success: false,
                message: 'Fees data not found'
            });
        }

        res.json({
            success: true,
            ...fees.fees
        });
    } catch (error) {
        console.error('Error reading fees:', error);
        res.status(500).json({
            success: false,
            message: 'Error reading fees data'
        });
    }
});

// ─── FEES ROUTES (MongoDB only) ────────────────────────────────────────────────

// GET /admin/get-fees
router.get('/get-fees', async (req, res) => {
  try {
    const dept = req.query.department || 'default';
    const db   = getDatabase();
    const doc  = await db.collection('fees').findOne({ department: dept });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Fees data not found' });
    }
    res.json({ success: true, fees: doc.fees });
  } catch (error) {
    console.error('Error getting fees:', error);
    res.status(500).json({ success: false, message: 'Error getting fees data' });
  }
});

// POST /admin/update-fees
router.post('/update-fees', auth, async (req, res) => {
  try {
    const { department = 'default', fees } = req.body;
    const db = getDatabase();
    await db.collection('fees').updateOne(
      { department },
      { $set: { fees } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating fees:', error);
    res.status(500).json({ success: false, message: 'Error updating fees' });
  }
});

// Get staff for a specific department
router.get('/get-staff', async (req, res) => {
    try {
        const { department } = req.query;
        console.log('Getting staff for department:', department);
        
        const db = getDatabase();
        const staff = await db.collection('staff').findOne({ department });
        
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        console.log('Found HOD:', staff);
        
        res.json({
            success: true,
            hod: staff
        });
    } catch (error) {
        console.error('Error getting staff:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting staff data'
        });
    }
});

router.get('/get-staff-member', async (req, res) => {
    try {
        const db = getDatabase();
        const member = await db.collection('staff').findOne({
            department: req.query.department,
            id: req.query.id
        });
        res.json({ success: true, staff: member });
    } catch (error) {
        res.json({ success: false, message: 'Error reading staff data' });
    }
});

router.post('/update-staff', auth, async (req, res) => {
    try {
        const { department, name } = req.body;
        const db = getDatabase();
        
        const result = await db.collection('staff').updateOne(
            { department },
            { $set: { name } },
            { upsert: true }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ success: false, message: 'Error updating staff' });
    }
});

router.post('/delete-staff', auth, async (req, res) => {
    try {
        const { id, department } = req.body;
        const db = getDatabase();
        
        await db.collection('staff').deleteOne({
            department,
            id
        });
        
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: 'Error deleting staff' });
    }
});

// Board member routes
// const BOARD_MEMBERS_FILE = path.join(__dirname, '..', 'data', 'board_members.json');

// Get board members (public route)
router.get('/board-members', async (req, res) => {
    try {
        const db = getDatabase();
        const boardMembers = await db.collection('board_members').findOne({});
        
        res.json({ 
            success: true, 
            members: boardMembers ? boardMembers.members : [] 
        });
    } catch (error) {
        console.error('Error reading board members:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error reading board members data' 
        });
    }
});

// Add new board member
router.post('/add-board-member', auth, async (req, res) => {
    try {
        const { name, position, role } = req.body;
        const db = getDatabase();
        
        const newMember = {
            id: Date.now().toString(),
            name,
            position,
            role: role || 'Board Member'
        };
        
        const result = await db.collection('board_members').updateOne(
            {},
            { $push: { members: newMember } },
            { upsert: true }
        );
        
        res.json({ 
            success: true, 
            message: 'Board member added successfully',
            member: newMember
        });
    } catch (error) {
        console.error('Error adding board member:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error adding board member' 
        });
    }
});

// Update board member
router.post('/update-board-member', auth, async (req, res) => {
    try {
        const { members } = req.body;
        if (!Array.isArray(members)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid data format: members should be an array'
            });
        }

        const db = getDatabase();
        const result = await db.collection('board_members').updateOne(
            {},
            { $set: { members } },
            { upsert: true }
        );
        
        res.json({ 
            success: true, 
            message: 'Board members updated successfully'
        });
    } catch (error) {
        console.error('Error updating board members:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating board members: ' + error.message
        });
    }
});

// Delete board member
router.post('/delete-board-member', auth, async (req, res) => {
    try {
        const { id } = req.body;
        const db = getDatabase();
        
        const result = await db.collection('board_members').updateOne(
            {},
            { $pull: { members: { id } } }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Board member not found'
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Board member deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting board member:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error deleting board member' 
        });
    }
});

// Update HOD
router.post('/update-hod', auth, async (req, res) => {
    try {
        const { department, name } = req.body;
        
        if (!department || !name) {
            return res.status(400).json({
                success: false,
                message: 'Department and name are required'
            });
        }

        const db = getDatabase();
        const result = await db.collection('staff').updateOne(
            { department },
            { $set: { name } },
            { upsert: true }
        );
        
        res.json({ 
            success: true,
            message: 'HOD updated successfully'
        });
    } catch (error) {
        console.error('Error updating HOD:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating HOD' 
        });
    }
});

// Get current staff/HODs
router.get('/staff', async (req, res) => {
    try {
        const { department } = req.query;
        const db = getDatabase();
        
        let query = {};
        if (department) {
            query.department = department;
        }
        
        const staff = await db.collection('staff').find(query).toArray();
        res.json({ success: true, staff });
    } catch (error) {
        console.error('Error reading staff:', error);
        res.status(500).json({ success: false, message: 'Error reading staff data' });
    }
});

// Get enrollment data
router.get('/enrollment', async (req, res) => {
    try {
        const db = getDatabase();
        const enrollment = await db.collection('enrollment').findOne({});
        
        res.json({
            success: true,
            years: enrollment ? enrollment.years : []
        });
    } catch (error) {
        console.error('Error reading enrollment:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error reading enrollment data: ' + error.message 
        });
    }
});

// Update enrollment data
router.post('/update-enrollment', auth, async (req, res) => {
    try {
        const { years } = req.body;
        
        if (!Array.isArray(years)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid data format: years should be an array'
            });
        }

        // Validate each year's data
        for (const year of years) {
            if (!year.year || !year.boys || !year.girls) {
                return res.status(400).json({
                    success: false,
                    message: 'Each year must have year, boys, and girls data'
                });
            }
            // Calculate total
            year.total = parseInt(year.boys) + parseInt(year.girls);
        }

        const db = getDatabase();
        const result = await db.collection('enrollment').updateOne(
            {},
            { $set: { years } },
            { upsert: true }
        );
        
        res.json({ 
            success: true,
            message: 'Enrollment updated successfully'
        });
    } catch (error) {
        console.error('Error updating enrollment:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating enrollment' 
        });
    }
});

// ─── DEPARTMENTS ROUTE ────────────────────────────────────────────────────────
// GET /admin/departments
router.get('/departments', async (req, res) => {
  try {
    const db = getDatabase();
    // return all distinct department names
    const departments = await db.collection('staff').distinct('department');
    res.json({ success: true, departments });
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ success: false, message: 'Error fetching departments' });
  }
});

// ─── ADMISSIONS ROUTES ───────────────────────────────────────────────────────
// GET /admin/admissions (public)
router.get('/admissions', async (req, res) => {
  try {
    const db = getDatabase();
    const admissions = (await db.collection('admissions').findOne({})) || {};
    res.json({ success: true, admissions });
  } catch (err) {
    console.error('Error fetching admissions:', err);
    res.status(500).json({ success: false, message: 'Error fetching admissions' });
  }
});

// POST /admin/update-admissions (admin only)
router.post('/update-admissions', auth, async (req, res) => {
  try {
    const update = req.body; // { applications, accepted, rejected, pending }
    const db = getDatabase();
    await db.collection('admissions')
            .updateOne({}, { $set: update }, { upsert: true });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating admissions:', err);
    res.status(500).json({ success: false, message: 'Error updating admissions' });
  }
});

module.exports = router;
module.exports.initializeCollections = initializeCollections;
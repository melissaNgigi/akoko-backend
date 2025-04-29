const express = require('express');
const router = express.Router();
const fs = require('fs');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const { auth, JWT_SECRET } = require('../middleware/auth');

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

// Store credentials in a JSON file (in production, use a proper database)
const CREDENTIALS_FILE = path.join(__dirname, '..', 'data', 'admin_credentials.json');

// Default credentials for first-time setup
const DEFAULT_CREDENTIALS = {
    username: 'admin',
    password: bcrypt.hashSync('admin123', 8)
};

// Initialize credentials file if it doesn't exist
if (!fs.existsSync(CREDENTIALS_FILE)) {
    console.log('Creating new credentials file with default admin/admin123');
    console.log('Default credentials:', DEFAULT_CREDENTIALS);
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(DEFAULT_CREDENTIALS));
}

// Store fees in a JSON file (in production, use a proper database)
const FEES_FILE = path.join(__dirname, '..', 'data', 'fees.json');

// Initialize fees file if it doesn't exist
if (!fs.existsSync(FEES_FILE)) {
    const defaultFees = {
        boarding_term1: 20268,
        boarding_term2: 12160,
        boarding_term3: 8107,
        day_term1: 7000,
        day_term2: 4200,
        day_term3: 2800
    };
    fs.writeFileSync(FEES_FILE, JSON.stringify(defaultFees, null, 2));
}

// Staff management endpoints
const STAFF_FILE = path.join(__dirname, '..', 'data', 'staff.json');
const DEPARTMENT_PATH = path.join(__dirname, '..');

// Initialize staff file if it doesn't exist
if (!fs.existsSync(STAFF_FILE)) {
    fs.writeFileSync(STAFF_FILE, JSON.stringify({
        mathematics: {
            name: "Mr. Maurice Tuju"
        },
        science: {
            name: "Mrs. Jane Smith"
        },
        languages: {
            name: "Ms. Mary Johnson"
        },
        humanities: {
            name: "Mr. James Brown"
        },
        technical: {
            name: "Mr. Robert Wilson"
        },
        boarding: {
            name: "Mrs. Sarah Williams"
        },
        games: {
            name: "Mr. David Miller"
        },
        academics: {
            name: "Dr. Elizabeth Taylor"
        }
    }));
}

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
router.post('/login', (req, res) => {
    console.log('Received login request:', req.body);
    const { username, password } = req.body;
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE));
    
    if (username === credentials.username && 
        bcrypt.compareSync(password, credentials.password)) {
        console.log('Login successful');
        // Generate JWT token
        const token = jwt.sign(
            { username, isAdmin: true },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({ success: true, token });
    } else {
        console.log('Login failed');
        res.json({ success: false });
    }
});

// Change credentials endpoint
router.post('/change-credentials', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authenticated' 
        });
    }

    const { currentPassword, newUsername, newPassword } = req.body;
    
    try {
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE));

        // Verify current password
        if (!bcrypt.compareSync(currentPassword, credentials.password)) {
            return res.json({ 
                success: false, 
                message: 'Current password is incorrect' 
            });
        }

        // Update credentials
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        const newCredentials = {
            username: newUsername,
            password: hashedPassword
        };

        fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(newCredentials, null, 2));
        
        // Force re-login by destroying the session
        req.session.destroy();
        
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

// Get fees
router.get('/fees', (req, res) => {
    try {
        console.log('Reading fees from:', FEES_FILE);
        
        if (!fs.existsSync(FEES_FILE)) {
            console.log('Fees file not found, creating with default values');
            const defaultFees = {
                boarding_term1: 20268,
                boarding_term2: 12160,
                boarding_term3: 8107,
                day_term1: 7000,
                day_term2: 4200,
                day_term3: 2800
            };
            fs.writeFileSync(FEES_FILE, JSON.stringify(defaultFees, null, 2));
            return res.json({
                success: true,
                ...defaultFees
            });
        }
        
        const fees = JSON.parse(fs.readFileSync(FEES_FILE, 'utf8'));
        console.log('Sending fees data:', fees);
        
        res.json({
            success: true,
            ...fees
        });
    } catch (error) {
        console.error('Error reading fees:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error reading fees data: ' + error.message 
        });
    }
});

// Update fees
router.post('/update-fees', auth, (req, res) => {
    try {
        console.log('\nUpdating fees:', req.body);
        
        const requiredFields = [
            'boarding_term1', 'boarding_term2', 'boarding_term3',
            'day_term1', 'day_term2', 'day_term3'
        ];
        
        // Validate the data
        for (const field of requiredFields) {
            if (typeof req.body[field] !== 'number') {
                return res.status(400).json({
                    success: false,
                    message: `Invalid value for ${field}`
                });
            }
        }

        // Write the data
        writeFileSync(FEES_FILE, JSON.stringify(req.body, null, 2));
        
        res.json({ 
            success: true,
            message: 'Fees updated successfully',
            data: req.body
        });
    } catch (error) {
        console.error('Error updating fees:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating fees: ' + error.message 
        });
    }
});

// Public fees endpoint
router.get('/public-fees', (req, res) => {
    try {
        const fees = JSON.parse(fs.readFileSync(FEES_FILE));
        res.json({ success: true, fees }); // Return nested structure for client
    } catch (error) {
        res.json({ success: false, message: 'Error reading fees data' });
    }
});

// Get staff for a specific department
router.get('/get-staff', (req, res) => {
    try {
        const { department } = req.query;
        console.log('Getting staff for department:', department);
        
        const staffPath = path.join(__dirname, '..', 'data', 'staff.json');
        const staff = JSON.parse(fs.readFileSync(staffPath, 'utf8'));
        
        if (!staff[department]) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        console.log('Found HOD:', staff[department]);
        
        res.json({
            success: true,
            hod: staff[department]
        });
    } catch (error) {
        console.error('Error getting staff:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting staff data'
        });
    }
});

router.get('/get-staff-member', (req, res) => {
    try {
        const staff = JSON.parse(fs.readFileSync(STAFF_FILE));
        const member = staff[req.query.department].find(s => s.id === req.query.id);
        res.json({ success: true, staff: member });
    } catch (error) {
        res.json({ success: false, message: 'Error reading staff data' });
    }
});

router.post('/update-staff', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        const staff = JSON.parse(fs.readFileSync(STAFF_FILE));
        const { department, name } = req.body;
        
        if (!staff[department]) {
            return res.json({
                success: false,
                message: 'Invalid department'
            });
        }

        staff[department] = {
            name: name
        };

        fs.writeFileSync(STAFF_FILE, JSON.stringify(staff, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ success: false, message: 'Error updating staff' });
    }
});

router.post('/delete-staff', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        const staff = JSON.parse(fs.readFileSync(STAFF_FILE));
        const { id, department } = req.body;
        
        staff[department] = staff[department].filter(s => s.id !== id);
        fs.writeFileSync(STAFF_FILE, JSON.stringify(staff, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: 'Error deleting staff' });
    }
});

// Board member routes
const BOARD_MEMBERS_FILE = path.join(__dirname, '..', 'data', 'board_members.json');

// Check and create board members file if it doesn't exist
try {
    if (!fs.existsSync(BOARD_MEMBERS_FILE)) {
        const initialData = {
            members: []
        };
        fs.writeFileSync(BOARD_MEMBERS_FILE, JSON.stringify(initialData, null, 2));
        console.log('Created board_members.json file');
    }
    
    // Test file permissions
    fs.accessSync(BOARD_MEMBERS_FILE, fs.constants.R_OK | fs.constants.W_OK);
    console.log('Board members file is readable and writable');
} catch (error) {
    console.error('Error with board_members.json file:', error);
}

// Get board members (public route)
router.get('/board-members', (req, res) => {
    try {
        const boardMembers = JSON.parse(fs.readFileSync(BOARD_MEMBERS_FILE));
        res.json({ 
            success: true, 
            members: boardMembers.members 
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
router.post('/add-board-member', (req, res) => {
    console.log('Received add board member request:', req.body);
    
    if (!req.session.isAdmin) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        const boardMembers = JSON.parse(fs.readFileSync(BOARD_MEMBERS_FILE));
        const newMember = {
            id: Date.now().toString(),
            name: req.body.name,
            position: req.body.position,
            role: req.body.role || 'Board Member'
        };
        
        console.log('Creating new member:', newMember);
        
        // Make sure we're accessing the correct structure
        if (!boardMembers.members) {
            boardMembers.members = [];
        }
        
        boardMembers.members.push(newMember);
        fs.writeFileSync(BOARD_MEMBERS_FILE, JSON.stringify(boardMembers, null, 2));

        console.log('Added new board member:', newMember);
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
        // Log the incoming request
        console.log('Update request received:', req.body);

        const { members } = req.body;
        if (!Array.isArray(members)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid data format: members should be an array'
            });
        }

        // Create new board members structure
        const boardMembers = {
            members: members.map(member => ({
                id: member.id,
                name: member.name,
                position: member.position,
                role: member.role || 'Board Member'
            }))
        };

        // Log the data being written
        console.log('Writing board members:', boardMembers);

        // Write to file synchronously to avoid any race conditions
        fs.writeFileSync(
            path.join(__dirname, '..', 'data', 'board_members.json'),
            JSON.stringify(boardMembers, null, 2),
            'utf8'
        );

        console.log('Board members updated successfully');
        res.json({ 
            success: true, 
            message: 'Board members updated successfully'
        });
    } catch (error) {
        // Log the full error
        console.error('Error updating board members:', error);
        console.error('Stack trace:', error.stack);
        
        res.status(500).json({ 
            success: false, 
            message: 'Error updating board members: ' + error.message
        });
    }
});

// Delete board member
router.post('/delete-board-member', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        const { id } = req.body;
        const boardMembers = JSON.parse(fs.readFileSync(BOARD_MEMBERS_FILE));
        
        const initialLength = boardMembers.members.length;
        boardMembers.members = boardMembers.members.filter(member => member.id !== id);
        
        if (boardMembers.members.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: 'Board member not found'
            });
        }
        
        fs.writeFileSync(BOARD_MEMBERS_FILE, JSON.stringify(boardMembers, null, 2));
        console.log('Deleted board member with ID:', id);

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
        console.log('Updating HOD:', { department, name });
        
        if (!department || !name) {
            return res.status(400).json({
                success: false,
                message: 'Department and name are required'
            });
        }

        // Update staff.json
        const staffPath = path.join(__dirname, '..', 'data', 'staff.json');
        const staff = JSON.parse(fs.readFileSync(staffPath, 'utf8'));
        
        staff[department] = { name };
        fs.writeFileSync(staffPath, JSON.stringify(staff, null, 2));
        
        console.log('Updated staff.json successfully');
        
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
router.get('/staff', (req, res) => {
    try {
        const staff = JSON.parse(fs.readFileSync(STAFF_FILE));
        res.json({ 
            success: true,
            staff: staff 
        });
    } catch (error) {
        console.error('Error reading staff:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error reading staff data' 
        });
    }
});

// Add this with your other constants at the top
const ENROLLMENT_FILE = path.join(__dirname, '..', 'data', 'enrollment.json');

// Initialize enrollment file if it doesn't exist
if (!fs.existsSync(ENROLLMENT_FILE)) {
    const defaultEnrollment = {
        years: [
            {
                year: "2024",
                boys: 694,
                girls: 600,
                total: 1294
            }
        ]
    };
    fs.writeFileSync(ENROLLMENT_FILE, JSON.stringify(defaultEnrollment, null, 2));
}

// Get enrollment data
router.get('/enrollment', (req, res) => {
    try {
        console.log('Reading enrollment from:', ENROLLMENT_FILE);
        const enrollment = JSON.parse(fs.readFileSync(ENROLLMENT_FILE, 'utf8'));
        console.log('Sending enrollment data:', enrollment);
        res.json({
            success: true,
            years: enrollment.years
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
router.post('/update-enrollment', auth, (req, res) => {
    try {
        const { years } = req.body;
        console.log('Received enrollment update:', years);

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

        fs.writeFileSync(ENROLLMENT_FILE, JSON.stringify({ years }, null, 2));
        console.log('Updated enrollment successfully');
        
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

module.exports = router; 
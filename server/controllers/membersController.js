const { auth, db } = require('../config/firebaseAdmin');
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const memberValidationRules = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('surname').optional().trim(),
    body('age').optional().isInt({ min: 1, max: 150 }).toInt(),
    body('gender').optional().custom(val => {
        if (!val) return true;
        return ['male', 'female', 'other', 'Male', 'Female', 'Other'].includes(val);
    }),
    body('bloodGroup').optional().custom(val => {
        if (!val) return true;
        const normalized = val.toUpperCase();
        return ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(normalized);
    }),
    body('aadhaarLast4').optional().isLength({ min: 4, max: 4 }).isNumeric(),
    body('shopAddress').optional().trim(),
];

const toggleStatusValidationRules = [
    body('status').isIn(['active', 'blocked']).withMessage('Status must be active or blocked'),
];

// Get all members
const getAllMembers = async (req, res) => {
    try {
        const membersSnap = await db.collection('users')
            .where('role', '==', 'member')
            .orderBy('createdAt', 'desc')
            .get();
            
        const members = [];
        membersSnap.forEach(doc => {
            members.push({ uid: doc.id, ...doc.data() });
        });
        res.status(200).json(members);
    } catch (error) {
        console.error('❌ Error fetching members:', error);
        res.status(500).json({ 
            error: 'Failed to fetch members',
            details: error.message
        });
    }
};

// Create a new member (Admin only)
const createMember = async (req, res) => {
    const {
        email,
        password,
        name,
        surname,
        age,
        gender,
        bloodGroup,
        aadhaarLast4,
        shopAddress,
        nomineeDetails,
        memberId
    } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // 1. Create user in Firebase Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: `${name} ${surname}`.trim(),
        });

        // 2. Create user document in Firestore
        const memberData = {
            uid: userRecord.uid,
            memberId: memberId || `BCTA-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`,
            name,
            surname: surname || '',
            age: age || null,
            gender: gender || '',
            bloodGroup: bloodGroup || '',
            email,
            aadhaarLast4: aadhaarLast4 || '',
            shopAddress: shopAddress || '',
            nomineeDetails: nomineeDetails || { name: '', relation: '', phone: '' },
            role: 'member',
            status: 'active',
            attendanceCount: 0,
            paymentStatus: 'unpaid',
            photoURL: '',
            createdAt: new Date(),
        };

        await db.collection('users').doc(userRecord.uid).set(memberData);
        console.log(`✅ Member created successfully: ${userRecord.uid} (${memberId})`);

        res.status(201).json({ message: 'Member created successfully', member: memberData });
    } catch (error) {
        console.error('❌ Error creating member:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            body: req.body
        });
        res.status(500).json({ 
            error: error.message || 'Failed to create member',
            details: error.code || 'UNKNOWN_ERROR'
        });
    }
};

// Toggle member block status
const toggleMemberStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'blocked'

    if (status !== 'active' && status !== 'blocked') {
        return res.status(400).json({ error: 'Invalid status. Must be active or blocked' });
    }

    try {
        // Update Firestore
        await db.collection('users').doc(id).update({ status });

        // Revoke refresh tokens in Auth if blocking, forcing logout if they try to get a new token
        if (status === 'blocked') {
            await auth.revokeRefreshTokens(id);
        }

        res.status(200).json({ message: `Member status updated to ${status}` });
    }
};

// Permanently delete a member
const deleteMember = async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Delete from Firebase Auth
        await auth.deleteUser(id);
        
        // 2. Delete from Firestore
        await db.collection('users').doc(id).delete();
        
        console.log(`🗑️ Member deleted permanently: ${id}`);
        res.status(200).json({ message: 'Member deleted permanently from system' });
    } catch (error) {
        console.error('❌ Error deleting member:', error);
        res.status(500).json({ error: 'Failed to delete member permanently' });
    }
};

// Permanently delete ALL members
const deleteAllMembers = async (req, res) => {
    try {
        const membersSnap = await db.collection('users')
            .where('role', '==', 'member')
            .get();
            
        const deletePromises = [];
        membersSnap.forEach(doc => {
            const uid = doc.id;
            // Auth deletion
            deletePromises.push(auth.deleteUser(uid));
            // Firestore deletion
            deletePromises.push(db.collection('users').doc(uid).delete());
        });
        
        await Promise.all(deletePromises);
        
        console.log(`🗑️ Bulk deletion complete: ${membersSnap.size} members removed`);
        res.status(200).json({ message: `Successfully deleted ${membersSnap.size} members` });
    } catch (error) {
        console.error('❌ Error in bulk deletion:', error);
        res.status(500).json({ error: 'Failed to complete bulk deletion' });
    }
};

module.exports = {
    validate,
    memberValidationRules,
    toggleStatusValidationRules,
    getAllMembers,
    createMember,
    toggleMemberStatus,
    deleteMember,
    deleteAllMembers
};

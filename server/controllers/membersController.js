const { auth, db } = require('../config/firebaseAdmin');

// Get all members
const getAllMembers = async (req, res) => {
    try {
        const membersSnap = await db.collection('users').where('role', '==', 'member').get();
        const members = [];
        membersSnap.forEach(doc => {
            members.push({ uid: doc.id, ...doc.data() });
        });
        res.status(200).json(members);
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
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

        res.status(201).json({ message: 'Member created successfully', member: memberData });
    } catch (error) {
        console.error('Error creating member:', error);
        res.status(500).json({ error: error.message || 'Failed to create member' });
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
    } catch (error) {
        console.error('Error toggling member status:', error);
        res.status(500).json({ error: 'Failed to update member status' });
    }
};

module.exports = {
    getAllMembers,
    createMember,
    toggleMemberStatus
};

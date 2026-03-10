const { db } = require('../config/firebaseAdmin');

// Admin: Get all complaints
const getComplaints = async (req, res) => {
    try {
        const snaps = await db.collection('complaints').orderBy('createdAt', 'desc').get();
        const complaints = [];
        snaps.forEach(doc => complaints.push({ id: doc.id, ...doc.data() }));
        res.status(200).json(complaints);
    } catch (error) {
        console.error('Error fetching complaints:', error);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
};

// Member: Raise a new complaint
const raiseComplaint = async (req, res) => {
    const { description, imageURL } = req.body;
    const uid = req.user.uid;

    if (!description) {
        return res.status(400).json({ error: 'Description is required' });
    }

    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
        const userData = userDoc.data();

        const complaintData = {
            raisedBy: uid,
            memberId: userData.memberId,
            memberName: `${userData.name} ${userData.surname}`.trim(),
            description,
            imageURL: imageURL || '',
            status: 'open',
            createdAt: new Date(),
        };

        const docRef = await db.collection('complaints').add(complaintData);
        res.status(201).json({ message: 'Complaint raised', id: docRef.id });
    } catch (error) {
        console.error('Error raising complaint:', error);
        res.status(500).json({ error: 'Failed to raise complaint' });
    }
};

// Admin: Resolve Complaint
const resolveComplaint = async (req, res) => {
    const { id } = req.params;

    try {
        await db.collection('complaints').doc(id).update({ status: 'resolved' });
        res.status(200).json({ message: 'Complaint resolved' });
    } catch (error) {
        console.error('Error resolving complaint:', error);
        res.status(500).json({ error: 'Failed to resolve complaint' });
    }
};

// Admin: Delete Complaint
const deleteComplaint = async (req, res) => {
    const { id } = req.params;

    try {
        await db.collection('complaints').doc(id).delete();
        res.status(200).json({ message: 'Complaint deleted' });
    } catch (error) {
        console.error('Error deleting complaint:', error);
        res.status(500).json({ error: 'Failed to delete complaint' });
    }
};

module.exports = {
    getComplaints,
    raiseComplaint,
    resolveComplaint,
    deleteComplaint
};

const { db } = require('../config/firebaseAdmin');

const getPayments = async (req, res) => {
    try {
        const snaps = await db.collection('products').orderBy('distributedAt', 'desc').get();
        const payments = [];
        snaps.forEach(doc => payments.push({ id: doc.id, ...doc.data() }));
        res.status(200).json(payments);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payment records' });
    }
};

module.exports = {
    getPayments
};

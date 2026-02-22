const { db } = require('../config/firebaseAdmin');

// Admin: Get all shops
const getShops = async (req, res) => {
    try {
        const shopsSnap = await db.collection('shops').orderBy('createdAt', 'desc').get();
        const shops = [];
        shopsSnap.forEach(doc => shops.push({ id: doc.id, ...doc.data() }));
        res.status(200).json(shops);
    } catch (error) {
        console.error('Error fetching shops:', error);
        res.status(500).json({ error: 'Failed to fetch shops' });
    }
};

// Admin: Register a new shop
const createShop = async (req, res) => {
    const { shopName, ownerName, phone, address } = req.body;

    if (!shopName || !ownerName || !phone) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const docRef = await db.collection('shops').add({
            shopName,
            ownerName,
            phone,
            address: address || '',
            createdAt: new Date(),
        });

        // Save the document ID as shopId for QR generation
        await docRef.update({ shopId: docRef.id });

        res.status(201).json({ message: 'Shop created successfully', id: docRef.id });
    } catch (error) {
        console.error('Error creating shop:', error);
        res.status(500).json({ error: 'Failed to create shop' });
    }
};

// Shop Owner / Admin: Distribute Product
const distributeProduct = async (req, res) => {
    // memberData could be UID or memberId. We'll find them.
    const { shopId, memberQuery, productName, quantity, totalAmount, paidAmount } = req.body;

    if (!shopId || !memberQuery || !productName || !totalAmount) {
        return res.status(400).json({ error: 'Missing required product fields' });
    }

    try {
        // 1. Verify Shop
        const shopDoc = await db.collection('shops').doc(shopId).get();
        if (!shopDoc.exists) return res.status(404).json({ error: 'Shop not found' });
        const shop = shopDoc.data();

        // 2. Find Member (by UID or memberId)
        let memberSnap;
        if (memberQuery.startsWith('BCTA-')) {
            memberSnap = await db.collection('users').where('memberId', '==', memberQuery).get();
        } else {
            memberSnap = await db.collection('users').where('uid', '==', memberQuery).get();
        }

        if (memberSnap.empty) return res.status(404).json({ error: 'Member not found' });

        // Get first matching member doc
        const memberDoc = memberSnap.docs[0];
        const member = { id: memberDoc.id, ...memberDoc.data() };

        // 3. Verify member status
        if (member.status === 'blocked') {
            return res.status(403).json({ error: 'Member is blocked. Access denied.' });
        }

        // 4. Calculate remaining amount and create product log
        const remainingAmount = Number(totalAmount) - Number(paidAmount || 0);

        const productData = {
            shopId,
            shopName: shop.shopName,
            memberUID: member.id,
            memberId: member.memberId,
            memberName: `${member.name} ${member.surname}`.trim(),
            productName,
            quantity: Number(quantity) || 1,
            totalAmount: Number(totalAmount),
            paidAmount: Number(paidAmount || 0),
            remainingAmount,
            distributedAt: new Date(),
        };

        const prodRef = await db.collection('products').add(productData);

        // 5. Update user payment status if due
        if (remainingAmount > 0 && member.paymentStatus !== 'unpaid') {
            await db.collection('users').doc(member.id).update({ paymentStatus: 'partial' });
        }

        res.status(201).json({ message: 'Product distributed successfully', id: prodRef.id, product: productData });

    } catch (error) {
        console.error('Error distributing product:', error);
        res.status(500).json({ error: 'Failed to distribute product' });
    }
};

module.exports = {
    getShops,
    createShop,
    distributeProduct
};

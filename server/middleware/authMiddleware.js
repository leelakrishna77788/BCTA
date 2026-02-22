const { auth, db } = require('../config/firebaseAdmin');

// Middleware to verify Firebase ID Token
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken; // Add verified user to request
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

// Middleware to verify Role (Admin or Super Admin)
const requireAdmin = async (req, res, next) => {
    if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        if (!userDoc.exists) {
            return res.status(403).json({ error: 'Forbidden: User profile not found' });
        }

        const userData = userDoc.data();
        if (userData.role !== 'admin' && userData.role !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }

        // Attach role to request for later use
        req.user.role = userData.role;
        next();
    } catch (error) {
        console.error('Error checking admin role:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { verifyToken, requireAdmin };

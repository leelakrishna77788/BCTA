const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import configured firebase admin (runs initializer)
require('./config/firebaseAdmin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const membersRoutes = require('./routes/membersRoutes');
const meetingsRoutes = require('./routes/meetingsRoutes');
const shopsRoutes = require('./routes/shopsRoutes');
const complaintsRoutes = require('./routes/complaintsRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');

app.use('/api/members', membersRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/shops', shopsRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'BCTA Backend is running' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`========================================`);
});

const { db } = require('../config/firebaseAdmin');
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const createMeetingValidationRules = [
    body('topic').trim().notEmpty().withMessage('Topic is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('startTime').trim().notEmpty().withMessage('Start time is required'),
    body('endTime').optional().trim(),
    body('description').optional().trim(),
    body('location').optional().trim(),
    body('gpsLink').optional().trim().isURL().withMessage('GPS link must be a valid URL'),
    body('qrDuration').optional().isInt({ min: 1, max: 120 }).toInt(),
];

const markAttendanceValidationRules = [
    body('meetingId').trim().notEmpty().withMessage('Meeting ID is required'),
    body('token').trim().notEmpty().withMessage('Token is required'),
];

const markAttendanceByAdminValidationRules = [
    body('memberUID').trim().notEmpty().withMessage('Member UID is required'),
];

const qrTokenValidationRules = [
    body('qrToken').trim().notEmpty().withMessage('QR token is required'),
    body('qrExpiresAt').isISO8601().withMessage('QR expiry time is required'),
];

// Get all meetings (Admin only)
const getMeetings = async (req, res) => {
    try {
        const meetingsSnap = await db.collection('meetings').orderBy('createdAt', 'desc').get();
        const meetings = [];
        meetingsSnap.forEach(doc => {
            const data = doc.data();
            meetings.push({
                id: doc.id,
                ...data,
                date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
                qrExpiresAt: data.qrExpiresAt?.toDate ? data.qrExpiresAt.toDate().toISOString() : data.qrExpiresAt
            });
        });
        res.status(200).json(meetings);
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
};

// Get a single meeting by ID
const getMeetingById = async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await db.collection('meetings').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Meeting not found' });
        }
        const data = doc.data();
        res.status(200).json({
            id: doc.id,
            ...data,
            date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
            qrExpiresAt: data.qrExpiresAt?.toDate ? data.qrExpiresAt.toDate().toISOString() : data.qrExpiresAt
        });
    } catch (error) {
        console.error('Error fetching meeting:', error);
        res.status(500).json({ error: 'Failed to fetch meeting' });
    }
};

// Create a new meeting (Admin only)
const createMeeting = async (req, res) => {
    const { topic, description, date, startTime, endTime, location, gpsLink, qrDuration } = req.body;

    if (!topic || !date || !startTime) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const meetingData = {
            topic,
            description: description || '',
            date: new Date(date),
            startTime,
            endTime: endTime || '',
            location: location || '',
            gpsLink: gpsLink || '',
            qrToken: null,
            qrExpiresAt: null,
            qrDuration: Number(qrDuration) || 30,
            status: 'upcoming',
            createdBy: req.user.uid,
            createdAt: new Date(),
        };

        const docRef = await db.collection('meetings').add(meetingData);
        res.status(201).json({ message: 'Meeting created successfully', id: docRef.id, ...meetingData });
    } catch (error) {
        console.error('Error creating meeting:', error);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
};

// Start meeting QR (Admin only)
const startMeetingQR = async (req, res) => {
    const { id } = req.params;
    const { qrToken, qrExpiresAt } = req.body;

    if (!qrToken || !qrExpiresAt) {
        return res.status(400).json({ error: 'Missing qrToken or qrExpiresAt' });
    }

    try {
        await db.collection('meetings').doc(id).update({
            status: 'active',
            qrToken,
            qrExpiresAt: new Date(qrExpiresAt)
        });

        res.status(200).json({ message: 'Meeting QR started' });
    } catch (error) {
        console.error('Error starting meeting QR:', error);
        res.status(500).json({ error: 'Failed to start meeting QR' });
    }
};

// Stop meeting QR (Admin only)
const stopMeetingQR = async (req, res) => {
    const { id } = req.params;

    try {
        await db.collection('meetings').doc(id).update({
            status: 'expired',
            qrToken: null,
            qrExpiresAt: null
        });

        res.status(200).json({ message: 'Meeting QR stopped and expired' });
    } catch (error) {
        console.error('Error stopping meeting QR:', error);
        res.status(500).json({ error: 'Failed to stop meeting QR' });
    }
};

// Refresh meeting QR (Admin only)
const refreshMeetingQR = async (req, res) => {
    const { id } = req.params;
    const { qrToken } = req.body;

    if (!qrToken) {
        return res.status(400).json({ error: 'Missing qrToken' });
    }

    try {
        await db.collection('meetings').doc(id).update({
            qrToken
        });
        res.status(200).json({ message: 'Meeting QR refreshed', qrToken });
    } catch (error) {
        console.error('Error refreshing meeting QR:', error);
        res.status(500).json({ error: 'Failed to refresh meeting QR' });
    }
};

// Mark attendance by scanning the meeting QR (Member)
const markAttendance = async (req, res) => {
    const { meetingId, token } = req.body;
    const memberUID = req.user.uid;

    if (!meetingId || !token) {
        return res.status(400).json({ error: 'Missing meetingId or token' });
    }

    try {
        const meetingDoc = await db.collection('meetings').doc(meetingId).get();
        if (!meetingDoc.exists) return res.status(404).json({ error: 'Meeting not found' });

        const meeting = meetingDoc.data();

        // 1. Check Token Match
        if (meeting.qrToken !== token) {
            return res.status(400).json({ error: 'Invalid or expired QR token' });
        }

        // 2. Check Expiry
        if (meeting.qrExpiresAt && new Date() > meeting.qrExpiresAt.toDate()) {
            return res.status(400).json({ error: 'Meeting QR has expired' });
        }

        // 3. Check member status
        const userDoc = await db.collection('users').doc(memberUID).get();
        if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
        const userData = userDoc.data();

        if (userData.status === 'blocked') {
            return res.status(403).json({ error: 'You are blocked from attending meetings' });
        }

        // 4. Check duplicate scan
        const dupCheck = await db.collection('attendance')
            .where('meetingId', '==', meetingId)
            .where('memberUID', '==', memberUID)
            .get();

        if (!dupCheck.empty) {
            return res.status(400).json({ error: 'Attendance already marked', success: true, alreadyScanned: true });
        }

        // 5. Mark Attendance
        await db.collection('attendance').add({
            meetingId,
            memberId: userData.memberId,
            memberUID,
            memberName: `${userData.name} ${userData.surname}`.trim(),
            scannedAt: new Date(),
            status: 'present'
        });

        // 6. Increment user attendance count
        await db.collection('users').doc(memberUID).update({
            attendanceCount: (userData.attendanceCount || 0) + 1
        });

        res.status(200).json({ message: 'Attendance marked successfully', success: true });

    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
};

// Mark attendance for a member by Admin scanning their personal QR (Admin only)
const markAttendanceByAdmin = async (req, res) => {
    const { id: meetingId } = req.params;
    const { memberUID } = req.body;

    if (!memberUID) {
        return res.status(400).json({ error: 'Missing memberUID' });
    }

    try {
        // 1. Validate meeting exists
        const meetingDoc = await db.collection('meetings').doc(meetingId).get();
        if (!meetingDoc.exists) return res.status(404).json({ error: 'Meeting not found' });

        // 2. Validate member exists and is not blocked
        const userDoc = await db.collection('users').doc(memberUID).get();
        if (!userDoc.exists) return res.status(404).json({ error: 'Member not found' });
        const userData = userDoc.data();

        if (userData.status === 'blocked') {
            return res.status(403).json({ error: 'This member is blocked and cannot be marked present' });
        }

        // 3. Prevent duplicate
        const dupCheck = await db.collection('attendance')
            .where('meetingId', '==', meetingId)
            .where('memberUID', '==', memberUID)
            .get();

        if (!dupCheck.empty) {
            return res.status(400).json({ error: 'Attendance already marked', success: true, alreadyScanned: true });
        }

        // 4. Mark Attendance
        await db.collection('attendance').add({
            meetingId,
            memberId: userData.memberId,
            memberUID,
            memberName: `${userData.name} ${userData.surname}`.trim(),
            scannedAt: new Date(),
            status: 'present',
            markedBy: 'admin',
        });

        // 5. Increment attendance count
        await db.collection('users').doc(memberUID).update({
            attendanceCount: (userData.attendanceCount || 0) + 1
        });

        res.status(200).json({
            message: `Attendance marked for ${userData.name} ${userData.surname}`,
            success: true,
            memberName: `${userData.name} ${userData.surname}`.trim(),
        });

    } catch (error) {
        console.error('Error marking attendance by admin:', error);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
};

// Get attendance for a meeting (Admin only)
const getMeetingAttendance = async (req, res) => {
    const { id } = req.params;

    try {
        const [meetingSnap, attSnap, membersSnap] = await Promise.all([
            db.collection('meetings').doc(id).get(),
            db.collection('attendance').where('meetingId', '==', id).get(),
            db.collection('users').where('role', '==', 'member').get(),
        ]);

        if (!meetingSnap.exists) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        const meeting = { id: meetingSnap.id, ...meetingSnap.data() };
        const attended = [];
        attSnap.forEach(doc => attended.push(doc.data()));

        const members = [];
        membersSnap.forEach(doc => members.push({ id: doc.id, ...doc.data() }));

        res.status(200).json({
            meeting,
            attended,
            allMembers: members
        });
    } catch (error) {
        console.error('Error fetching meeting attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance data' });
    }
};

module.exports = {
    validate,
    createMeetingValidationRules,
    markAttendanceValidationRules,
    markAttendanceByAdminValidationRules,
    qrTokenValidationRules,
    getMeetings,
    getMeetingById,
    createMeeting,
    startMeetingQR,
    stopMeetingQR,
    refreshMeetingQR,
    markAttendance,
    markAttendanceByAdmin,
    getMeetingAttendance
};

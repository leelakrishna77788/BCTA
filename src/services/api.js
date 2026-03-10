import axios from 'axios';
import { auth } from '../firebase/firebase';

const NODE_ENV = import.meta.env.MODE;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Firebase ID Token
apiClient.interceptors.request.use(async (config) => {
    try {
        const user = auth.currentUser;
        if (user) {
            const token = await user.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.error("Error fetching Firebase token:", error);
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response Interceptor: Global Error Handling
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        console.error("API Error:", error.response || error.message);
        return Promise.reject(error.response?.data || { message: error.message });
    }
);

export const membersApi = {
    getAll: () => apiClient.get('/members'),
    getStats: () => apiClient.get('/members/stats'),
    create: (data) => apiClient.post('/members', data),
    block: (uid) => apiClient.patch(`/members/${uid}/block`),
    unblock: (uid) => apiClient.patch(`/members/${uid}/unblock`),
};

export const meetingsApi = {
    getAll: () => apiClient.get('/meetings'),
    create: (data) => apiClient.post('/meetings', data),
    getById: (id) => apiClient.get(`/meetings/${id}`),
    start: (id, data) => apiClient.patch(`/meetings/${id}/start`, data),
    refreshQR: (id, qrToken) => apiClient.post(`/meetings/${id}/refresh-qr`, { qrToken }),
    stop: (id) => apiClient.patch(`/meetings/${id}/stop`),
    markAttendance: (data) => apiClient.post('/meetings/attend', data),
    getAttendance: (id) => apiClient.get(`/meetings/${id}/attendance`),
    delete: (id) => apiClient.delete(`/meetings/${id}`),
};

export const shopsApi = {
    getAll: () => apiClient.get('/shops'),
    create: (data) => apiClient.post('/shops', data),
    getStats: () => apiClient.get('/shops/stats'),
    distributeProduct: (data) => apiClient.post('/shops/distribute', data),
};

export const complaintsApi = {
    getAll: () => apiClient.get('/complaints'),
    resolve: (id, resolution) => apiClient.patch(`/complaints/${id}/resolve`, { resolution }),
    delete: (id) => apiClient.delete(`/complaints/${id}`),
};

export const notificationsApi = {
    getAll: () => apiClient.get('/notifications'),
    send: (data) => apiClient.post('/notifications/send', data),
};

export const adminApi = {
    getDashboardStats: () => apiClient.get('/admin/dashboard-stats'),
};

export const paymentsApi = {
    getAll: () => apiClient.get('/payments'),
};

export default apiClient;

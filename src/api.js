// src/api.js

export const API_CONFIG = {
    USE_PROXY_FOR_AUTH: false,
    USE_PROXY_FOR_RAG: false,
    AUTH_BASE_URL: 'http://localhost:8000',
    RAG_BASE_URL: 'http://localhost:3636',
    ENDPOINTS: {
        LOGIN: '/api/auth/login',
        DOCUMENTS_LIST: '/documents/list',
        DOCUMENT_DETAILS: '/documents/list/details',
        DOCUMENT_RETRIEVE: '/documents/retrieve',
        VECTOR_ADD: '/documents/vector/add',
        VECTOR_GET: '/documents/vector',
        VECTOR_UPDATE: '/documents/vector',
        VECTOR_DELETE: '/documents/vector',
        VECTOR_SEARCH: '/documents/vector/search',
        PROCESS_QUERY: '/documents/vector/process-query',
    },
};

// Token Manager - Sử dụng sessionStorage
export const TokenManager = {
    get: () => {
        try {
            const token = sessionStorage.getItem('access_token');
            const expiry = sessionStorage.getItem('token_expiry');
            if (!token || !expiry) return null;
            if (Date.now() > parseInt(expiry)) {
                TokenManager.clear();
                return null;
            }
            return token;
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    },
    set: (token, expiresIn = 3600) => {
        try {
            const expiry = Date.now() + (expiresIn * 1000);
            sessionStorage.setItem('access_token', token);
            sessionStorage.setItem('token_expiry', expiry.toString());
        } catch (error) {
            console.error('Error setting token:', error);
        }
    },
    clear: () => {
        try {
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('token_expiry');
            sessionStorage.removeItem('refresh_token');
            sessionStorage.removeItem('user_data'); // Dọn dẹp cả user_data
        } catch (error) {
            console.error('Error clearing token:', error);
        }
    },
    isExpiringSoon: () => {
        try {
            const expiry = sessionStorage.getItem('token_expiry');
            if (!expiry) return true;
            const timeLeft = parseInt(expiry) - Date.now();
            return timeLeft < 300000; // 5 minutes
        } catch (error) {
            console.error('Error checking token expiry:', error);
            return true;
        }
    },
};

export const getFullUrl = (endpoint, isLoginEndpoint = false) => {
    if (isLoginEndpoint) {
        return API_CONFIG.USE_PROXY_FOR_AUTH ? endpoint : `${API_CONFIG.AUTH_BASE_URL}${endpoint}`;
    }
    return API_CONFIG.USE_PROXY_FOR_RAG ? endpoint : `${API_CONFIG.RAG_BASE_URL}${endpoint}`;
};

export const apiRequest = async (endpoint, options = {}, requireAuth = true) => {
    const isLoginEndpoint = endpoint === API_CONFIG.ENDPOINTS.LOGIN;
    const url = getFullUrl(endpoint, isLoginEndpoint);
    const headers = new Headers(options.headers || {});
    const isFormData = options.body instanceof FormData;

    if (!isFormData && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (requireAuth) {
        const token = TokenManager.get();
        if (!token) {
            // Trả về một Promise bị reject để có thể bắt lỗi ở nơi gọi
            return Promise.reject(new Error('No authentication token available. Please login.'));
        }
        headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
};

export const safeJsonParse = async (response) => {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (error) {
        console.error('Failed to parse JSON response:', text);
        return { error: 'Server returned a non-JSON response.', content: text };
    }
};
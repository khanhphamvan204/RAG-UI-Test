// src/contexts/AuthContext.js

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { API_CONFIG, apiRequest, safeJsonParse, TokenManager } from './api'; // Giả sử file api.js nằm ở thư mục src/

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => TokenManager.get());
    const [loading, setLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const logout = useCallback(() => {
        if (!isMountedRef.current) return;
        TokenManager.clear();
        setToken(null);
        setUser(null);
        setIsReady(false);
        setError(null);
    }, []);

    const clearError = useCallback(() => {
        if (isMountedRef.current) {
            setError(null);
        }
    }, []);

    // Effect này để khởi tạo trạng thái auth khi tải lại trang
    useEffect(() => {
        const initializeAuth = () => {
            if (!isMountedRef.current) return;

            const currentToken = TokenManager.get();
            if (currentToken) {
                const userData = sessionStorage.getItem('user_data');
                if (userData) {
                    try {
                        const parsedUser = JSON.parse(userData);
                        if (isMountedRef.current) {
                            setUser(parsedUser);
                            setToken(currentToken);
                            setIsReady(true);
                        }
                    } catch (err) {
                        console.error('Error parsing user data:', err);
                        if (isMountedRef.current) {
                            logout(); // Nếu dữ liệu user bị lỗi, đăng xuất luôn
                        }
                    }
                } else {
                    // Có token nhưng không có user data, đăng xuất
                    if (isMountedRef.current) {
                        logout();
                    }
                }
            }
            if (isMountedRef.current) {
                setLoading(false);
            }
        };

        initializeAuth();
    }, [logout]);


    const login = useCallback(async (username, password) => {
        if (!isMountedRef.current) return { success: false, error: 'Component unmounted' };

        try {
            setLoading(true);
            setError(null);

            const response = await apiRequest(API_CONFIG.ENDPOINTS.LOGIN, {
                method: 'POST',
                body: JSON.stringify({ user_code: username, password: password }),
            }, false); // Login không yêu cầu auth

            if (!isMountedRef.current) return { success: false, error: 'Component unmounted' };

            const data = await safeJsonParse(response);

            if (response.ok && data.success) {
                if (!data.data || !data.data.token || !data.data.user) {
                    throw new Error('Cấu trúc dữ liệu đăng nhập không hợp lệ');
                }

                if (isMountedRef.current) {
                    TokenManager.set(data.data.token);
                    sessionStorage.setItem('user_data', JSON.stringify(data.data.user)); // THỐNG NHẤT SỬ DỤNG sessionStorage

                    setToken(data.data.token);
                    setUser(data.data.user);
                    setIsReady(true);
                    setError(null);
                }
                return { success: true, data: data.data };
            } else {
                const errorMessage = data.message || data.error || `Đăng nhập thất bại: ${response.status}`;
                if (isMountedRef.current) {
                    setError(errorMessage);
                }
                return { success: false, error: errorMessage, statusCode: response.status };
            }

        } catch (error) {
            const errorMessage = 'Lỗi kết nối mạng hoặc server không phản hồi.';
            if (isMountedRef.current) {
                setError(errorMessage);
            }
            return { success: false, error: errorMessage };
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, []);

    const contextValue = useMemo(() => ({
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        loading,
        isReady,
        error,
        clearError,
    }), [user, token, login, logout, loading, isReady, error, clearError]);

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
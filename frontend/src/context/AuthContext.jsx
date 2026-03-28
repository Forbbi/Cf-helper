import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import {jwtDecode} from 'jwt-decode';

const AuthContext = createContext();

const apiBase = 'http://localhost:8000';

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            axios.get(`${apiBase}/api/me`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => {
                setUser(res.data);
            })
            .catch(() => {
                logout();
            })
            .finally(() => setIsLoading(false));
        } else {
            localStorage.removeItem('token');
            setUser(null);
            setIsLoading(false);
        }
    }, [token]);

    const login = async (googleToken) => {
        try {
            const res = await axios.post(`${apiBase}/api/auth/google`, { token: googleToken });
            setToken(res.data.access_token);
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
    };

    const updateHandle = async (handle) => {
        try {
            const res = await axios.post(`${apiBase}/api/me/handle`, { handle }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data);
        } catch (error) {
            console.error("Failed to update handle", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, updateHandle, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

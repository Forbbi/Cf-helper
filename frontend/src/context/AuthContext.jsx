import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import {jwtDecode} from 'jwt-decode';
import { API_BASE } from '../services/api';

const AuthContext = createContext();

const apiBase = API_BASE;

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
        console.log("[FRONTEND] Initiating login with Google token:", googleToken ? googleToken.substring(0, 15) + "..." : "missing");
        console.log("[FRONTEND] API_BASE is:", apiBase);
        try {
            const res = await axios.post(`${apiBase}/api/auth/google`, { token: googleToken });
            console.log("[FRONTEND] Login successful, received access_token:", res.data.access_token ? "Yes" : "No");
            setToken(res.data.access_token);
        } catch (error) {
            console.error("[FRONTEND ERROR] Login failed:", error);
            if (error.response) {
                console.error("[FRONTEND ERROR] Response data:", error.response.data);
                console.error("[FRONTEND ERROR] Response status:", error.response.status);
            } else if (error.request) {
                console.error("[FRONTEND ERROR] No response received from server. Is the backend running at", apiBase, "?");
            }
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

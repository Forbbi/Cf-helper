import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getUser, getSolved, getBookmarks, addBookmark, removeBookmark } from '../services/api';
import axios from 'axios';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [handle, setHandle] = useState(() => localStorage.getItem('cf_handle') || '');
    const [userInfo, setUserInfo] = useState(null);
    const [solvedSet, setSolvedSet] = useState(new Set());
    const [bookmarks, setBookmarks] = useState([]);
    const [userLoading, setUserLoading] = useState(false);
    const [userError, setUserError] = useState(null);

    const loadUser = useCallback(async (h) => {
        if (!h) return;
        setUserLoading(true);
        setUserError(null);
        try {
            const [info, solvedData] = await Promise.all([getUser(h), getSolved(h)]);
            setUserInfo(info);
            setSolvedSet(new Set(solvedData.solved));
            localStorage.setItem('cf_handle', h);
        } catch (e) {
            setUserError(e.response?.data?.detail || 'User not found');
            setUserInfo(null);
            setSolvedSet(new Set());
        } finally {
            setUserLoading(false);
        }
    }, []);

    const loadBookmarks = useCallback(async () => {
        try {
            const data = await getBookmarks();
            setBookmarks(data);
        } catch { }
    }, []);

    useEffect(() => {
        loadBookmarks();
        // Auto-load handle: use saved handle, or fetch default from backend
        const saved = localStorage.getItem('cf_handle');
        if (saved) {
            loadUser(saved);
        } else {
            axios.get('http://localhost:8000/api/config').then(r => {
                const defaultHandle = r.data.default_handle;
                if (defaultHandle) {
                    setHandle(defaultHandle);
                    loadUser(defaultHandle);
                }
            }).catch(() => { });
        }
    }, []);

    const bookmark = useCallback(async (problem) => {
        try {
            const bm = await addBookmark({
                contest_id: problem.contest_id,
                index: problem.index,
                name: problem.name,
                rating: problem.rating,
                tags: problem.tags,
                url: problem.url,
            });
            setBookmarks(prev => [bm, ...prev]);
        } catch { }
    }, []);

    const unbookmark = useCallback(async (contestId, index) => {
        try {
            await removeBookmark(contestId, index);
            setBookmarks(prev => prev.filter(b => !(b.contest_id === contestId && b.index === index)));
        } catch { }
    }, []);

    const bookmarkedIds = new Set(bookmarks.map(b => `${b.contest_id}_${b.index}`));

    return (
        <AppContext.Provider value={{
            handle, setHandle,
            userInfo, userLoading, userError,
            solvedSet, bookmarks, bookmarkedIds,
            loadUser, loadBookmarks, bookmark, unbookmark,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);

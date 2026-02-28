import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8000' });
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const fetchWithCache = async (key, fetcher) => {
    if (cache.has(key)) {
        const { data, timestamp } = cache.get(key);
        if (Date.now() - timestamp < CACHE_TTL) return data;
    }
    const data = await fetcher();
    cache.set(key, { data, timestamp: Date.now() });
    return data;
};

export const getUser = (handle) => fetchWithCache(`user_${handle}`, () => api.get(`/api/user/${handle}`).then(r => r.data));
export const getSolved = (handle) => fetchWithCache(`solved_${handle}`, () => api.get(`/api/user/${handle}/solved`).then(r => r.data));
export const getSubmissions = (handle) => fetchWithCache(`subs_${handle}`, () => api.get(`/api/user/${handle}/submissions`).then(r => r.data));
export const getTags = () => fetchWithCache('tags', () => api.get('/api/tags').then(r => r.data));
export const getProblems = (params) => fetchWithCache(`probs_${JSON.stringify(params)}`, () => api.get('/api/problems', { params }).then(r => r.data));
export const getProblemsCount = (params) => fetchWithCache(`probCount_${JSON.stringify(params)}`, () => api.get('/api/problems/count', { params }).then(r => r.data));

export const getBookmarks = () => api.get('/api/bookmarks').then(r => r.data);
export const addBookmark = (bm) => api.post('/api/bookmarks', bm).then(r => r.data);
export const removeBookmark = (contestId, index) => api.delete(`/api/bookmarks/${contestId}/${index}`).then(r => r.data);

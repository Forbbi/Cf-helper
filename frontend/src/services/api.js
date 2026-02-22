import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8000' });

export const getUser = (handle) => api.get(`/api/user/${handle}`).then(r => r.data);
export const getSolved = (handle) => api.get(`/api/user/${handle}/solved`).then(r => r.data);
export const getSubmissions = (handle) => api.get(`/api/user/${handle}/submissions`).then(r => r.data);
export const getTags = () => api.get('/api/tags').then(r => r.data);
export const getProblems = (params) => api.get('/api/problems', { params }).then(r => r.data);
export const getProblemsCount = (params) => api.get('/api/problems/count', { params }).then(r => r.data);
export const getBookmarks = () => api.get('/api/bookmarks').then(r => r.data);
export const addBookmark = (bm) => api.post('/api/bookmarks', bm).then(r => r.data);
export const removeBookmark = (contestId, index) =>
    api.delete(`/api/bookmarks/${contestId}/${index}`).then(r => r.data);

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { getProblems, getProblemsCount } from '../services/api';
import { useApp } from './AppContext';

const ProblemsContext = createContext(null);

const PAGE_SIZE = 50;
const BATCH_PAGES = 3;
const BATCH_SIZE = PAGE_SIZE * BATCH_PAGES;

export function ProblemsProvider({ children }) {
    const { handle } = useApp();
    const [filters, setFilters] = useState({ tags: [], min_rating: null, max_rating: null, status: 'all' });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const [buffer, setBuffer] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [batchPage, setBatchPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [prefetching, setPrefetching] = useState(false);
    const [noMore, setNoMore] = useState(false);
    const [error, setError] = useState(null);
    const lastFetchRef = useRef(0);

    const buildParams = useCallback((f, h) => ({
        ...(f.tags.length > 0 && { tags: f.tags.join(',') }),
        ...(f.min_rating && { min_rating: f.min_rating }),
        ...(f.max_rating && { max_rating: f.max_rating }),
        ...(h && { handle: h }),
    }), []);

    const fetchBatch = useCallback(async ({ f, h, batchNum, isFirst }) => {
        const fetchId = Date.now();
        lastFetchRef.current = fetchId;

        if (isFirst) { setLoading(true); setError(null); setBuffer([]); setNoMore(false); }
        else setPrefetching(true);

        try {
            const params = {
                ...buildParams(f, h),
                page: batchNum,
                page_size: BATCH_SIZE,
            };
            const promises = [getProblems(params)];
            if (isFirst) promises.push(getProblemsCount(buildParams(f, h)));

            const results = await Promise.all(promises);
            if (lastFetchRef.current !== fetchId) return;

            const data = results[0];
            if (isFirst) {
                setBuffer(data);
                setTotal(results[1].count);
            } else {
                setBuffer(prev => [...prev, ...data]);
            }
            if (data.length < BATCH_SIZE) setNoMore(true);
            setBatchPage(batchNum + 1);
        } catch (e) {
            if (lastFetchRef.current !== fetchId) return;
            if (isFirst) setError(e.response?.data?.detail || 'Failed to load problems');
        } finally {
            if (lastFetchRef.current !== fetchId) return;
            if (isFirst) setLoading(false);
            else setPrefetching(false);
        }
    }, [buildParams]);

    useEffect(() => {
        setPage(1);
        setBatchPage(1);
        fetchBatch({ f: filters, h: handle, batchNum: 1, isFirst: true });
    }, [filters, handle, fetchBatch]); 

    const triggerPrefetch = useCallback(() => {
        if (prefetching || noMore) return;
        fetchBatch({ f: filters, h: handle, batchNum: batchPage, isFirst: false });
    }, [prefetching, noMore, fetchBatch, filters, handle, batchPage]);

    return (
        <ProblemsContext.Provider value={{
            filters, setFilters,
            sortConfig, setSortConfig,
            buffer, total, page, setPage, batchPage,
            loading, prefetching, noMore, error,
            triggerPrefetch,
            PAGE_SIZE, BATCH_PAGES, BATCH_SIZE
        }}>
            {children}
        </ProblemsContext.Provider>
    );
}

export const useProblems = () => useContext(ProblemsContext);

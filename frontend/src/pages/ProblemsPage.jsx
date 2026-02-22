import { useState, useEffect, useCallback, useRef } from 'react';
import FilterPanel from '../components/FilterPanel';
import ProblemRow from '../components/ProblemRow';
import { getProblems, getProblemsCount } from '../services/api';
import { useApp } from '../context/AppContext';
import './ProblemsPage.css';

const PAGE_SIZE = 50;   // problems shown per page
const BATCH_PAGES = 3;   // how many PAGE_SIZE pages to fetch per backend call
const BATCH_SIZE = PAGE_SIZE * BATCH_PAGES;   // 150

export default function ProblemsPage() {
    const { handle, solvedSet } = useApp();
    const [filters, setFilters] = useState({ tags: [], min_rating: null, max_rating: null, status: 'all' });

    // All problems fetched so far (grows in chunks of BATCH_SIZE)
    const [buffer, setBuffer] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);         // current display page (1-indexed)
    const [batchPage, setBatchPage] = useState(1);       // next batch to fetch (1-indexed)
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

    // ── Fetch a batch from the backend ────────────────────────────────────────
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

    // Reset on filter/handle change
    useEffect(() => {
        setPage(1);
        setBatchPage(1);
        fetchBatch({ f: filters, h: handle, batchNum: 1, isFirst: true });
    }, [filters, handle]); // eslint-disable-line

    // ── Apply client-side status filter ───────────────────────────────────────
    const filteredBuffer = buffer.filter(p => {
        if (filters.status === 'all') return true;
        const key = `${p.contest_id}_${p.index}`;
        if (filters.status === 'solved') return solvedSet.has(key);
        if (filters.status === 'unsolved') return !solvedSet.has(key);
        return true;
    });

    // Problems visible on the current page
    const start = (page - 1) * PAGE_SIZE;
    const pageProblems = filteredBuffer.slice(start, start + PAGE_SIZE);

    // Total pages we can show from buffer so far (capped by real total)
    const totalBufferPages = Math.ceil(filteredBuffer.length / PAGE_SIZE);
    const totalPages = Math.ceil(total / PAGE_SIZE);

    // Prefetch next batch when user reaches the last page of the current buffer
    const triggerPrefetch = useCallback(() => {
        if (prefetching || noMore) return;
        fetchBatch({ f: filters, h: handle, batchNum: batchPage, isFirst: false });
    }, [prefetching, noMore, fetchBatch, filters, handle, batchPage]);

    const goToPage = useCallback((nextPage) => {
        setPage(nextPage);
        // If user is on the last preloaded page, prefetch the next batch
        if (nextPage >= totalBufferPages && !noMore) {
            triggerPrefetch();
        }
    }, [totalBufferPages, noMore, triggerPrefetch]);

    return (
        <div className="problems-page">
            <aside className="sidebar">
                <FilterPanel filters={filters} onChange={f => { setFilters(f); }} />
            </aside>

            <main className="problems-main">
                <div className="problems-header">
                    <h1 className="page-title">Problems</h1>
                    <div className="problems-meta">
                        {!loading && (
                            <span className="total-count">
                                {total.toLocaleString()} problems
                                {filters.tags.length > 0 && ` · ${filters.tags.join(', ')}`}
                            </span>
                        )}
                        {handle && solvedSet.size > 0 && (
                            <span className="solved-badge">✓ {solvedSet.size.toLocaleString()} solved</span>
                        )}
                        {prefetching && (
                            <span className="prefetch-hint">⟳ Loading more…</span>
                        )}
                    </div>
                </div>

                <div className="table-header">
                    <div className="th-status">Status</div>
                    <div className="th-id">#</div>
                    <div className="th-name">Problem</div>
                    <div className="th-rating">Rating</div>
                    <div className="th-count">Accepted</div>
                    <div className="th-actions"></div>
                </div>

                {loading && (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <span>Fetching problems from Codeforces...</span>
                    </div>
                )}

                {error && <div className="error-state">⚠️ {error}</div>}

                {!loading && !error && (
                    <div className="problems-list">
                        {pageProblems.length === 0 ? (
                            <div className="empty-state">No problems match your filters.</div>
                        ) : (
                            pageProblems.map(p => (
                                <ProblemRow key={`${p.contest_id}_${p.index}`} problem={p} />
                            ))
                        )}
                    </div>
                )}

                {!loading && totalPages > 1 && (
                    <div className="pagination">
                        <button
                            className="page-btn"
                            disabled={page === 1}
                            onClick={() => goToPage(page - 1)}
                        >← Prev</button>

                        <span className="page-info">Page {page} of {totalPages}</span>

                        <button
                            className="page-btn"
                            disabled={page >= totalBufferPages && (noMore || prefetching)}
                            onClick={() => goToPage(page + 1)}
                        >Next →</button>
                    </div>
                )}
            </main>
        </div>
    );
}

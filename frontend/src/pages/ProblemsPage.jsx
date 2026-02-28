import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import FilterPanel from '../components/FilterPanel';
import ProblemRow from '../components/ProblemRow';
import { useApp } from '../context/AppContext';
import { useProblems } from '../context/ProblemsContext';
import './ProblemsPage.css';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.04 }
    }
};

const SortIcon = ({ columnKey, sortConfig }) => {
    if (sortConfig.key !== columnKey) return <span className="sort-icon inactive">↕</span>;
    return <span className="sort-icon active">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
};

export default function ProblemsPage() {
    const { handle, solvedSet } = useApp();
    const {
        filters, setFilters,
        sortConfig, setSortConfig,
        buffer, total, page, setPage, batchPage,
        loading, prefetching, noMore, error,
        triggerPrefetch,
        PAGE_SIZE
    } = useProblems();

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        } else if (sortConfig.key !== key) {
            direction = key === 'rating' || key === 'solved_count' ? 'desc' : 'asc';
        }
        setSortConfig({ key, direction });
    };

    // ── Apply client-side status filter ───────────────────────────────────────
    const filteredBuffer = buffer.filter(p => {
        if (filters.status === 'all') return true;
        const key = `${p.contest_id}_${p.index}`;
        if (filters.status === 'solved') return solvedSet.has(key);
        if (filters.status === 'unsolved') return !solvedSet.has(key);
        return true;
    });

    const sortedBuffer = useMemo(() => {
        let sortable = [...filteredBuffer];
        if (sortConfig.key) {
            sortable.sort((a, b) => {
                let aVal, bVal;
                if (sortConfig.key === 'id') {
                    aVal = `${a.contest_id}${a.index}`;
                    bVal = `${b.contest_id}${b.index}`;
                } else if (sortConfig.key === 'name') {
                    aVal = a.name; bVal = b.name;
                } else if (sortConfig.key === 'rating') {
                    aVal = a.rating || 0; bVal = b.rating || 0;
                } else if (sortConfig.key === 'solved_count') {
                    aVal = a.solved_count || 0; bVal = b.solved_count || 0;
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortable;
    }, [filteredBuffer, sortConfig]);

    // Problems visible on the current page
    const start = (page - 1) * PAGE_SIZE;
    const pageProblems = sortedBuffer.slice(start, start + PAGE_SIZE);

    // Total pages we can show from buffer so far (capped by real total)
    const totalBufferPages = Math.ceil(filteredBuffer.length / PAGE_SIZE);
    const totalPages = Math.ceil(total / PAGE_SIZE);

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
                    <div className="th-id sortable-header" onClick={() => handleSort('id')}># <SortIcon columnKey="id" sortConfig={sortConfig} /></div>
                    <div className="th-name sortable-header" onClick={() => handleSort('name')}>Problem <SortIcon columnKey="name" sortConfig={sortConfig} /></div>
                    <div className="th-rating sortable-header" onClick={() => handleSort('rating')}>Rating <SortIcon columnKey="rating" sortConfig={sortConfig} /></div>
                    <div className="th-count sortable-header" onClick={() => handleSort('solved_count')}>Accepted <SortIcon columnKey="solved_count" sortConfig={sortConfig} /></div>
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
                    <motion.div
                        key={page}
                        className="problems-list"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {pageProblems.length === 0 ? (
                            <div className="empty-state">No problems match your filters.</div>
                        ) : (
                            pageProblems.map(p => (
                                <ProblemRow key={`${p.contest_id}_${p.index}`} problem={p} />
                            ))
                        )}
                    </motion.div>
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

import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import './BookmarksPage.css';

const ratingColor = (r) => {
    if (!r) return '#888';
    if (r < 1200) return '#4ade80';
    if (r < 1600) return '#a3e635';
    if (r < 1900) return '#38bdf8';
    if (r < 2100) return '#818cf8';
    if (r < 2400) return '#c084fc';
    if (r < 3000) return '#fb923c';
    return '#f87171';
};

function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

const SortIcon = ({ columnKey, sortConfig }) => {
    if (sortConfig.key !== columnKey) return <span className="sort-icon inactive">↕</span>;
    return <span className="sort-icon active">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
};

export default function BookmarksPage() {
    const { bookmarks, solvedSet, unbookmark } = useApp();
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        } else if (sortConfig.key !== key) {
            direction = key === 'rating' ? 'desc' : (key === 'created_at' ? 'desc' : 'asc');
        }
        setSortConfig({ key, direction });
    };

    const sortedBookmarks = useMemo(() => {
        let sortable = [...bookmarks];
        if (sortConfig.key !== null) {
            sortable.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key === 'problem') {
                    aVal = `${a.contest_id}${a.index}`;
                    bVal = `${b.contest_id}${b.index}`;
                } else if (sortConfig.key === 'created_at') {
                    aVal = new Date(a.created_at).getTime();
                    bVal = new Date(b.created_at).getTime();
                } else if (sortConfig.key === 'rating') {
                    aVal = a.rating || 0;
                    bVal = b.rating || 0;
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortable;
    }, [bookmarks, sortConfig]);

    if (bookmarks.length === 0) {
        return (
            <div className="bookmarks-empty">
                <div className="empty-icon">★</div>
                <h2>No bookmarks yet</h2>
                <p>Star problems on the Problems page to save them here.</p>
            </div>
        );
    }

    return (
        <div className="bookmarks-page">
            <div className="bookmarks-header">
                <h1 className="page-title">Bookmarks</h1>
                <span className="bookmark-count">{bookmarks.length} saved</span>
            </div>

            {/* Table Header */}
            <div className="bm-table-header">
                <div className="bmth-problem sortable-header" onClick={() => handleSort('problem')}>
                    Problem <SortIcon columnKey="problem" sortConfig={sortConfig} />
                </div>
                <div className="bmth-rating sortable-header" onClick={() => handleSort('rating')}>
                    Rating <SortIcon columnKey="rating" sortConfig={sortConfig} />
                </div>
                <div className="bmth-tags">Tags</div>
                <div className="bmth-when sortable-header" onClick={() => handleSort('created_at')}>
                    Saved <SortIcon columnKey="created_at" sortConfig={sortConfig} />
                </div>
                <div className="bmth-remove"></div>
            </div>

            {/* Table Body */}
            <div className="bm-table-body">
                {sortedBookmarks.map((bm, i) => {
                    const key = `${bm.contest_id}_${bm.index}`;
                    const isSolved = solvedSet.has(key);
                    return (
                        <div
                            key={bm.id}
                            className={`bm-row ${isSolved ? 'solved' : ''}`}
                            style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s` }}
                        >
                            {/* Problem */}
                            <div className="bmth-problem">
                                <a href={bm.url} target="_blank" rel="noopener noreferrer" className="bm-prob-link">
                                    <span className="bm-prob-id">{bm.contest_id}{bm.index}</span>
                                    {bm.name}
                                </a>
                                {isSolved && <span className="bm-solved-pill">✓ Solved</span>}
                            </div>

                            {/* Rating */}
                            <div className="bmth-rating">
                                {bm.rating ? (
                                    <span
                                        className="bm-rating-chip"
                                        style={{
                                            color: ratingColor(bm.rating),
                                            borderColor: ratingColor(bm.rating) + '44',
                                            background: ratingColor(bm.rating) + '15',
                                        }}
                                    >
                                        {bm.rating}
                                    </span>
                                ) : (
                                    <span className="bm-no-rating">—</span>
                                )}
                            </div>

                            {/* Tags */}
                            <div className="bmth-tags">
                                {(bm.tags || []).slice(0, 3).map(t => (
                                    <span key={t} className="bm-tag">{t}</span>
                                ))}
                                {(bm.tags || []).length > 3 && (
                                    <span className="bm-tag more">+{(bm.tags || []).length - 3}</span>
                                )}
                            </div>

                            {/* When */}
                            <div className="bmth-when">
                                <span className="bm-time">{timeAgo(bm.created_at)}</span>
                            </div>

                            {/* Remove */}
                            <div className="bmth-remove">
                                <button
                                    className="bm-remove-btn"
                                    onClick={() => unbookmark(bm.contest_id, bm.index)}
                                    title="Remove bookmark"
                                >
                                    ★
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

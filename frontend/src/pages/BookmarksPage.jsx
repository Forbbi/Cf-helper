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

export default function BookmarksPage() {
    const { bookmarks, solvedSet, unbookmark } = useApp();

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
                <div className="bmth-problem">Problem</div>
                <div className="bmth-rating">Rating</div>
                <div className="bmth-tags">Tags</div>
                <div className="bmth-when">Saved</div>
                <div className="bmth-remove"></div>
            </div>

            {/* Table Body */}
            <div className="bm-table-body">
                {bookmarks.map((bm, i) => {
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

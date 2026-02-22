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

            <div className="bookmarks-grid">
                {bookmarks.map(bm => {
                    const key = `${bm.contest_id}_${bm.index}`;
                    const isSolved = solvedSet.has(key);
                    return (
                        <div key={bm.id} className={`bookmark-card ${isSolved ? 'solved' : ''}`}>
                            <div className="bookmark-card-header">
                                <span className="bm-id">{bm.contest_id}{bm.index}</span>
                                {bm.rating && (
                                    <span className="bm-rating" style={{ color: ratingColor(bm.rating), background: ratingColor(bm.rating) + '15', borderColor: ratingColor(bm.rating) + '44' }}>
                                        {bm.rating}
                                    </span>
                                )}
                                <button className="bm-remove" onClick={() => unbookmark(bm.contest_id, bm.index)} title="Remove">×</button>
                            </div>

                            <a href={bm.url} target="_blank" rel="noopener noreferrer" className="bm-name">
                                {bm.name}
                            </a>

                            {isSolved && <div className="bm-solved">✓ Solved</div>}

                            <div className="bm-tags">
                                {(bm.tags || []).slice(0, 3).map(t => (
                                    <span key={t} className="bm-tag">{t}</span>
                                ))}
                                {(bm.tags || []).length > 3 && (
                                    <span className="bm-tag more">+{(bm.tags || []).length - 3}</span>
                                )}
                            </div>

                            <div className="bm-date">
                                Saved {new Date(bm.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

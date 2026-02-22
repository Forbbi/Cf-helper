import { useApp } from '../context/AppContext';
import './ProblemRow.css';

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

const ratingLabel = (r) => {
    if (!r) return '?';
    if (r < 1200) return 'Newbie';
    if (r < 1600) return 'Pupil';
    if (r < 1900) return 'Spec.';
    if (r < 2100) return 'Expert';
    if (r < 2400) return 'C.M.';
    if (r < 3000) return 'Master';
    return 'GM+';
};

export default function ProblemRow({ problem }) {
    const { solvedSet, bookmarkedIds, bookmark, unbookmark } = useApp();
    const key = `${problem.contest_id}_${problem.index}`;
    const isSolved = solvedSet.has(key);
    const isBookmarked = bookmarkedIds.has(key);

    const handleBookmark = (e) => {
        e.preventDefault();
        if (isBookmarked) unbookmark(problem.contest_id, problem.index);
        else bookmark(problem);
    };

    return (
        <div className={`problem-row ${isSolved ? 'solved' : ''}`}>
            <div className="problem-status">
                {isSolved ? (
                    <span className="status-icon solved" title="Solved">✓</span>
                ) : (
                    <span className="status-icon unsolved" title="Unsolved">○</span>
                )}
            </div>

            <div className="problem-id">
                <span className="problem-num">{problem.contest_id}{problem.index}</span>
            </div>

            <div className="problem-name-col">
                <a
                    href={problem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="problem-name"
                >
                    {problem.name}
                </a>
                <div className="problem-tags">
                    {problem.tags.slice(0, 4).map(t => (
                        <span key={t} className="tag-badge">{t}</span>
                    ))}
                    {problem.tags.length > 4 && (
                        <span className="tag-badge more">+{problem.tags.length - 4}</span>
                    )}
                </div>
            </div>

            <div className="problem-rating-col">
                {problem.rating && (
                    <span
                        className="rating-badge"
                        style={{ color: ratingColor(problem.rating), borderColor: ratingColor(problem.rating) + '44', background: ratingColor(problem.rating) + '15' }}
                    >
                        {problem.rating}
                        <span className="rating-label" style={{ color: ratingColor(problem.rating) + 'aa' }}>
                            {ratingLabel(problem.rating)}
                        </span>
                    </span>
                )}
            </div>

            <div className="problem-solved-count">
                {problem.solved_count != null && (
                    <span className="solved-count">👥 {problem.solved_count.toLocaleString()}</span>
                )}
            </div>

            <div className="problem-actions">
                <button
                    className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
                    onClick={handleBookmark}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                >
                    {isBookmarked ? '★' : '☆'}
                </button>
            </div>
        </div>
    );
}

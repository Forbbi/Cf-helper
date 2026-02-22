import { useState } from 'react';
import { useApp } from '../context/AppContext';
import './Navbar.css';

export default function Navbar({ activePage, onNavigate }) {
    const { handle, setHandle, userInfo, userLoading, userError, loadUser } = useApp();
    const [input, setInput] = useState(handle);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim()) {
            setHandle(input.trim());
            loadUser(input.trim());
        }
    };

    const rankColor = {
        'newbie': '#808080',
        'pupil': '#008000',
        'specialist': '#03a89e',
        'expert': '#0000ff',
        'candidate master': '#aa00aa',
        'master': '#ff8c00',
        'international master': '#ff8c00',
        'grandmaster': '#ff0000',
        'international grandmaster': '#ff0000',
        'legendary grandmaster': '#ff0000',
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand" onClick={() => onNavigate('problems')}>
                <span className="navbar-logo">⚡</span>
                <span className="navbar-title">CF<span className="accent">Tracker</span></span>
            </div>

            <div className="navbar-links">
                <button
                    className={`nav-link ${activePage === 'problems' ? 'active' : ''}`}
                    onClick={() => onNavigate('problems')}
                >
                    Problems
                </button>
                <button
                    className={`nav-link ${activePage === 'bookmarks' ? 'active' : ''}`}
                    onClick={() => onNavigate('bookmarks')}
                >
                    Bookmarks
                </button>
                <button
                    className={`nav-link ${activePage === 'submissions' ? 'active' : ''}`}
                    onClick={() => onNavigate('submissions')}
                >
                    Submissions
                </button>
            </div>

            <form className="handle-form" onSubmit={handleSubmit}>
                <div className="handle-input-wrap">
                    <input
                        className="handle-input"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Your CF handle..."
                    />
                    <button type="submit" className="handle-btn" disabled={userLoading}>
                        {userLoading ? '...' : '→'}
                    </button>
                </div>
                {userError && <div className="handle-error">{userError}</div>}
            </form>

            {userInfo && (
                <div className="user-pill">
                    <img src={userInfo.avatar} alt="avatar" className="user-avatar" />
                    <div className="user-meta">
                        <span className="user-handle">{userInfo.handle}</span>
                        <span
                            className="user-rank"
                            style={{ color: rankColor[userInfo.rank?.toLowerCase()] || '#a0a0c0' }}
                        >
                            {userInfo.rating ? `${userInfo.rating} · ` : ''}{userInfo.rank}
                        </span>
                    </div>
                </div>
            )}
        </nav>
    );
}

import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin, GoogleLogin } from '@react-oauth/google';
import './Navbar.css';

export default function Navbar({ activePage, onNavigate }) {
    const { handle, setHandle, userInfo, userLoading, userError, loadUser } = useApp();
    const { user, login, logout, updateHandle, isLoading: authLoading } = useAuth();
    
    const [input, setInput] = useState(handle);

    useEffect(() => {
        // Auto-load handle if authenticated user has one
        if (user && user.cf_handle && user.cf_handle !== handle) {
            setHandle(user.cf_handle);
            loadUser(user.cf_handle);
            setInput(user.cf_handle);
        }
    }, [user, handle, setHandle, loadUser]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (trimmed) {
            if (user && user.cf_handle !== trimmed) {
                try {
                    await updateHandle(trimmed);
                } catch (e) {
                    console.error("Failed to link handle", e);
                }
            }
            setHandle(trimmed);
            loadUser(trimmed);
        }
    };

    const googleLogin = useGoogleLogin({
        onSuccess: tokenResponse => login(tokenResponse.credential || tokenResponse.access_token), // Note: useGoogleLogin typically returns access_token unless using implicit flow. Actually @react-oauth/google's useGoogleLogin without implicit flow needs exchange. Let's use standard googleLogin. Wait, standard returns access_token. Let's provide an easy way.
    });

    const triggerLogin = useGoogleLogin({
        onSuccess: credentialResponse => {
            // Need to pass it to auth context
            // When using flow: 'implicit' it returns access_token.
            // Since backend verifies id_token, we actually shouldn't use `useGoogleLogin` if we expect an id_token without extra steps.
            // But let's just assume we can get it or we will use `<GoogleLogin>` component.
        }
    });

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
            <div className="navbar-brand" onClick={() => onNavigate('submissions')}>
                <span className="navbar-title">CF<span className="accent">Tracker</span></span>
            </div>

            <div className="navbar-links">
                <button
                    className={`nav-link ${activePage === 'submissions' ? 'active' : ''}`}
                    onClick={() => onNavigate('submissions')}
                >
                    Profile
                </button>
                <button
                    className={`nav-link ${activePage === 'problems' ? 'active' : ''}`}
                    onClick={() => onNavigate('problems')}
                >
                    Problems
                </button>
                {user && (
                    <>
                        <button
                            className={`nav-link ${activePage === 'bookmarks' ? 'active' : ''}`}
                            onClick={() => onNavigate('bookmarks')}
                        >
                            Bookmarks
                        </button>
                    </>
                )}
                <button
                    className={`nav-link ${activePage === 'compiler' ? 'active' : ''}`}
                    onClick={() => onNavigate('compiler')}
                >
                    Compiler
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

            <div className="auth-section">
                {authLoading ? (
                    <span className="nav-link">Loading...</span>
                ) : user ? (
                    <div className="user-profile-menu">
                        <img src={user.picture || 'https://via.placeholder.com/32'} alt="avatar" className="auth-avatar" />
                        <span className="auth-name">{user.name}</span>
                        <button onClick={logout} className="logout-btn">Logout</button>
                    </div>
                ) : (
                    <div className="google-login-btn-container">
                        {/* We will just build it inside the Nav since we want the Google specific id_token */}
                        <GoogleLoginWrapper login={login} />
                    </div>
                )}
            </div>

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

function GoogleLoginWrapper({ login }) {
    return (
        <GoogleLogin
            onSuccess={credentialResponse => {
                login(credentialResponse.credential);
            }}
            onError={() => {
                console.log('Login Failed');
            }}
            size="medium"
            shape="pill"
            theme="filled_black"
        />
    );
}

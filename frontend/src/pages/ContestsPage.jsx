import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getContests } from '../services/api';
import './ContestsPage.css';

export default function ContestsPage() {
    const [contests, setContests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchContests = async () => {
            try {
                setLoading(true);
                const data = await getContests();
                setContests(data);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch contests", err);
                setError("Failed to load contests. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchContests();
    }, []);

    const formatTime = (seconds) => {
        if (!seconds) return 'TBA';
        const date = new Date(seconds * 1000);
        return date.toLocaleString([], { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const formatDuration = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m > 0 ? m + 'm' : ''}`;
    };

    const upcomingContests = contests.filter(c => c.phase === 'BEFORE' || c.phase === 'CODING');
    const finishedContests = contests.filter(c => c.phase === 'FINISHED');

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    if (loading) {
        return (
            <div className="contests-loading">
                <div className="loader"></div>
                <p>Fetching upcoming battles...</p>
            </div>
        );
    }

    return (
        <div className="contests-page">
            <header className="contests-header">
                <motion.h1 
                    initial={{ x: -20, opacity: 0 }} 
                    animate={{ x: 0, opacity: 1 }}
                >
                    Contests
                </motion.h1>
                <motion.p 
                    initial={{ x: -20, opacity: 0 }} 
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    Stay ahead of the game. Track upcoming Codeforces contests.
                </motion.p>
            </header>

            {error && <div className="error-message">{error}</div>}

            <div className="contests-grid">
                <section className="contests-section">
                    <h2 className="section-title">Upcoming & Ongoing</h2>
                    <motion.div 
                        className="contests-list"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {upcomingContests.length > 0 ? upcomingContests.map(contest => (
                            <motion.div 
                                key={contest.id} 
                                className={`contest-card ${contest.phase === 'CODING' ? 'ongoing' : ''}`}
                                variants={itemVariants}
                                whileHover={{ scale: 1.02, translateY: -5 }}
                            >
                                <div className="contest-badge">
                                    {contest.phase === 'CODING' ? 'LIVE NOW' : 'UPCOMING'}
                                </div>
                                <h3 className="contest-name">{contest.name}</h3>
                                <div className="contest-details">
                                    <div className="detail">
                                        <span className="icon">📅</span>
                                        <span className="value">{formatTime(contest.start_time_seconds)}</span>
                                    </div>
                                    <div className="detail">
                                        <span className="icon">⏱️</span>
                                        <span className="value">{formatDuration(contest.duration_seconds)}</span>
                                    </div>
                                    <div className="detail">
                                        <span className="icon">🏆</span>
                                        <span className="value">{contest.type}</span>
                                    </div>
                                </div>
                                <a 
                                    href={`https://codeforces.com/contest/${contest.id}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="register-btn"
                                >
                                    {contest.phase === 'CODING' ? 'Enter' : 'Register'}
                                </a>
                            </motion.div>
                        )) : (
                            <div className="no-contests">No upcoming contests found.</div>
                        )}
                    </motion.div>
                </section>

                <section className="contests-section">
                    <h2 className="section-title">Recently Finished</h2>
                    <motion.div 
                        className="contests-list recent"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {finishedContests.map(contest => (
                            <motion.div 
                                key={contest.id} 
                                className="contest-card finished"
                                variants={itemVariants}
                                whileHover={{ scale: 1.01 }}
                            >
                                <div className="finished-info">
                                    <h4 className="contest-name">{contest.name}</h4>
                                    <p className="contest-date">{formatTime(contest.start_time_seconds)}</p>
                                </div>
                                <a 
                                    href={`https://codeforces.com/contest/${contest.id}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="results-link"
                                >
                                    View
                                </a>
                            </motion.div>
                        ))}
                    </motion.div>
                </section>
            </div>
        </div>
    );
}

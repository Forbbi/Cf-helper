import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getSubmissions } from '../services/api';
import './SubmissionsPage.css';

const VERDICT_LABEL = {
    OK: 'Accepted',
    WRONG_ANSWER: 'Wrong Answer',
    TIME_LIMIT_EXCEEDED: 'TLE',
    MEMORY_LIMIT_EXCEEDED: 'MLE',
    RUNTIME_ERROR: 'Runtime Error',
    COMPILATION_ERROR: 'Compile Error',
    CHALLENGED: 'Hacked',
    SKIPPED: 'Skipped',
    PARTIAL: 'Partial',
};

const ratingColor = (r) => {
    if (!r) return '#666';
    if (r < 1200) return '#4ade80';
    if (r < 1400) return '#a3e635';
    if (r < 1600) return '#facc15';
    if (r < 1900) return '#38bdf8';
    if (r < 2100) return '#818cf8';
    if (r < 2400) return '#c084fc';
    if (r < 3000) return '#fb923c';
    return '#f87171';
};

const RATING_BUCKETS = [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500];

const TIME_RANGES = [
    { key: '1m', label: '1 Month', days: 30 },
    { key: '3m', label: '3 Months', days: 90 },
    { key: '6m', label: '6 Months', days: 180 },
    { key: '1y', label: '1 Year', days: 365 },
    { key: 'all', label: 'All Time', days: null },
];

function timeAgo(seconds) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - seconds;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(seconds * 1000).toLocaleDateString();
}

function StatCard({ label, value, sub, color }) {
    return (
        <div className="stat-card" style={{ '--accent': color }}>
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-label">{label}</div>
            {sub && <div className="stat-sub">{sub}</div>}
        </div>
    );
}

const SortIcon = ({ columnKey, sortConfig }) => {
    if (sortConfig.key !== columnKey) return <span className="sort-icon inactive">↕</span>;
    return <span className="sort-icon active">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
};

function HBarChart({ data, maxVal, colorFn }) {
    if (!data.length) return null;
    return (
        <div className="hbar-chart">
            {data.map(({ key, count }) => (
                <div key={key} className="hbar-row">
                    <span className="hbar-label">{key}</span>
                    <div className="hbar-track">
                        <div className="hbar-fill" style={{ width: `${(count / maxVal) * 100}%`, background: colorFn ? colorFn(key) : '#818cf8' }} />
                    </div>
                    <span className="hbar-count">{count}</span>
                </div>
            ))}
        </div>
    );
}

/**
 * Stacked tag bar chart.
 * - Green = solved (had OK verdict)
 * - Red = stuck (only non-AC, never solved) — clickable to drill down
 */
function StackedTagChart({ data, maxVal, onClickStuck }) {
    if (!data.length) return null;
    return (
        <>
            <div className="stacked-legend">
                <span><span className="legend-dot green" /> Solved</span>
                <span><span className="legend-dot red" /> Stuck problems <span className="legend-hint">(click red to see problems)</span></span>
            </div>
            <div className="hbar-chart">
                {data.map(({ key, solved, stuck }) => {
                    const solvedPct = (solved / maxVal) * 100;
                    const stuckPct = (stuck / maxVal) * 100;
                    return (
                        <div key={key} className="hbar-row">
                            <span className="hbar-label" title={key}>{key}</span>
                            <div className="hbar-track stacked">
                                <div className="hbar-fill green" style={{ width: `${solvedPct}%` }} title={`Solved: ${solved}`} />
                                <div
                                    className={`hbar-fill red ${stuck > 0 ? 'clickable' : ''}`}
                                    style={{ width: `${stuckPct}%` }}
                                    title={stuck > 0 ? `Stuck (never solved): ${stuck} — click to view` : `Stuck: 0`}
                                    onClick={() => stuck > 0 && onClickStuck(key)}
                                />
                            </div>
                            <span className="hbar-count">
                                <span className="cnt-green">{solved}</span>
                                {stuck > 0 && <><span className="cnt-sep">/</span><span className="cnt-red">{stuck}</span></>}
                            </span>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

export default function SubmissionsPage() {
    const { handle, bookmark, unbookmark, bookmarkedIds } = useApp();
    const effectiveHandle = handle || localStorage.getItem('cf_handle') || '';

    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [verdictFilter, setVerdictFilter] = useState('all');
    const [timeRange, setTimeRange] = useState('1y');
    const [page, setPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'time_seconds', direction: 'desc' });
    // For tag drill-down panel
    const [selectedStuckTag, setSelectedStuckTag] = useState(null);

    const PAGE_SIZE = 50;

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        } else if (sortConfig.key !== key) {
            direction = key === 'rating' ? 'desc' : (key === 'time_seconds' ? 'desc' : 'asc');
        }
        setSortConfig({ key, direction });
    };

    useEffect(() => {
        if (!effectiveHandle) return;
        setLoading(true);
        setError(null);
        getSubmissions(effectiveHandle)
            .then(data => { setSubmissions(data); setPage(1); })
            .catch(e => setError(e.response?.data?.detail || 'Failed to load submissions'))
            .finally(() => setLoading(false));
    }, [effectiveHandle]);

    // ── Time range ────────────────────────────────────────────────────────────
    const cutoffSeconds = useMemo(() => {
        const tr = TIME_RANGES.find(r => r.key === timeRange);
        return (!tr || tr.days === null) ? null : Math.floor(Date.now() / 1000) - tr.days * 86400;
    }, [timeRange]);

    const rangedSubmissions = useMemo(() => {
        if (!cutoffSeconds) return submissions;
        return submissions.filter(s => s.time_seconds >= cutoffSeconds);
    }, [submissions, cutoffSeconds]);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const totalAttempts = rangedSubmissions.length;
        const acSubs = rangedSubmissions.filter(s => s.verdict === 'OK');
        const acKeys = new Set(acSubs.map(s => `${s.problem.contest_id}_${s.problem.index}`));
        const attemptedKeys = new Set(rangedSubmissions.map(s => `${s.problem.contest_id}_${s.problem.index}`));
        const successRate = totalAttempts > 0
            ? ((acSubs.length / totalAttempts) * 100).toFixed(1)
            : '0.0';
        // stuckCount = problems that had ≥1 non-AC attempt (regardless of eventual outcome)
        const probFailCount = {};
        for (const sub of rangedSubmissions) {
            if (sub.verdict !== 'OK') {
                const key = `${sub.problem.contest_id}_${sub.problem.index}`;
                probFailCount[key] = (probFailCount[key] || 0) + 1;
            }
        }
        const stuckCount = Object.keys(probFailCount).length;
        return { totalAttempts, totalAC: acSubs.length, uniqueSolved: acKeys.size, uniqueAttempted: attemptedKeys.size, stuckCount, successRate };
    }, [rangedSubmissions]);

    // ── Difficulty chart ──────────────────────────────────────────────────────
    const diffData = useMemo(() => {
        const solvedPerRating = {};
        const seen = new Set();
        for (const sub of rangedSubmissions) {
            if (sub.verdict !== 'OK') continue;
            const key = `${sub.problem.contest_id}_${sub.problem.index}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const r = sub.problem.rating;
            if (!r) continue;
            solvedPerRating[r] = (solvedPerRating[r] || 0) + 1;
        }
        return RATING_BUCKETS.map(b => ({ key: String(b), count: solvedPerRating[b] || 0 })).filter(x => x.count > 0);
    }, [rangedSubmissions]);

    const diffMax = useMemo(() => Math.max(...diffData.map(d => d.count), 1), [diffData]);

    // ── Tag chart ─────────────────────────────────────────────────────────────
    // green = problems solved with ZERO non-AC attempts (clean solve)
    // red   = problems that had ≥1 non-AC attempt (struggled, whether eventually solved or not)
    // Each problem falls into exactly ONE bucket → no overlap → stacked bar is correct
    const tagData = useMemo(() => {
        const probTags = {};   // key → Set<tag>
        const probSolved = new Set();   // keys with at least one OK
        const probFailed = new Set();   // keys with at least one non-OK

        for (const sub of rangedSubmissions) {
            const key = `${sub.problem.contest_id}_${sub.problem.index}`;
            if (!probTags[key]) probTags[key] = new Set(sub.problem.tags);
            else sub.problem.tags.forEach(t => probTags[key].add(t));
            if (sub.verdict === 'OK') probSolved.add(key);
            else probFailed.add(key);
        }

        const tagSolved = {};   // clean solves
        const tagStuck = {};   // had any failure

        for (const [key, tags] of Object.entries(probTags)) {
            const hadFailure = probFailed.has(key);
            const wasSolved = probSolved.has(key);
            for (const t of tags) {
                if (hadFailure) {
                    // goes to red regardless of eventual AC
                    tagStuck[t] = (tagStuck[t] || 0) + 1;
                } else if (wasSolved) {
                    // clean solve
                    tagSolved[t] = (tagSolved[t] || 0) + 1;
                }
            }
        }

        const allTags = new Set([...Object.keys(tagSolved), ...Object.keys(tagStuck)]);
        return [...allTags]
            .map(t => ({ key: t, solved: tagSolved[t] || 0, stuck: tagStuck[t] || 0 }))
            .sort((a, b) => (b.solved + b.stuck) - (a.solved + a.stuck))
            .slice(0, 14);
    }, [rangedSubmissions]);

    const tagMax = useMemo(() => Math.max(...tagData.map(d => d.solved + d.stuck), 1), [tagData]);

    // ── Stuck problems (≥1 non-AC attempt, including struggled-then-solved) ───
    const stuckProblems = useMemo(() => {
        const probInfo = {};
        const probSolved = new Set();
        for (const sub of rangedSubmissions) {
            const key = `${sub.problem.contest_id}_${sub.problem.index}`;
            if (!probInfo[key]) probInfo[key] = { ...sub.problem, failCount: 0, everSolved: false };
            if (sub.verdict !== 'OK') probInfo[key].failCount++;
            else probInfo[key].everSolved = true;
            if (sub.verdict === 'OK') probSolved.add(key);
        }
        return Object.values(probInfo)
            .filter(p => p.failCount > 0)
            .sort((a, b) => b.failCount - a.failCount);
    }, [rangedSubmissions]);

    // ── All stuck problems for selected tag (red bar drill-down) ───────────────
    const stuckTagProblems = useMemo(() => {
        if (!selectedStuckTag) return [];
        // Include ALL stuck problems for this tag: both struggled-then-solved AND never solved
        return stuckProblems.filter(p =>
            (p.tags || []).includes(selectedStuckTag)
        );
    }, [selectedStuckTag, stuckProblems]);

    const filtered = useMemo(() => {
        const result = rangedSubmissions.filter(s => {
            const nameMatch = s.problem.name.toLowerCase().includes(search.toLowerCase());
            const verdictMatch =
                verdictFilter === 'all' ||
                (verdictFilter === 'ac' && s.verdict === 'OK') ||
                (verdictFilter === 'wa' && s.verdict !== 'OK');
            return nameMatch && verdictMatch;
        });

        if (sortConfig.key) {
            result.sort((a, b) => {
                let aVal, bVal;
                if (sortConfig.key === 'verdict') {
                    aVal = a.verdict; bVal = b.verdict;
                } else if (sortConfig.key === 'problem') {
                    aVal = `${a.problem.contest_id}${a.problem.index}`;
                    bVal = `${b.problem.contest_id}${b.problem.index}`;
                } else if (sortConfig.key === 'rating') {
                    aVal = a.problem.rating || 0;
                    bVal = b.problem.rating || 0;
                } else if (sortConfig.key === 'time_seconds') {
                    aVal = a.time_seconds; bVal = b.time_seconds;
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [rangedSubmissions, search, verdictFilter, sortConfig]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    if (!effectiveHandle) {
        return (
            <div className="sub-empty">
                <div className="empty-icon">📊</div>
                <h2>Enter your CF handle</h2>
                <p>Set your Codeforces handle in the top bar to view your submissions.</p>
            </div>
        );
    }

    return (
        <div className="submissions-page">

            {/* ── Header + Time Range ─────────────────────────────────────── */}
            <section className="stats-section">
                <div className="sub-page-header">
                    <h1 className="page-title">Submissions</h1>
                    <div className="time-range-chips">
                        {TIME_RANGES.map(tr => (
                            <button key={tr.key} className={`tr-chip ${timeRange === tr.key ? 'active' : ''}`}
                                onClick={() => { setTimeRange(tr.key); setPage(1); setSelectedStuckTag(null); }}>
                                {tr.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading && <div className="sub-loading"><div className="spinner" /><span>Loading submissions…</span></div>}
                {error && <div className="sub-error">⚠️ {error}</div>}

                {!loading && !error && (
                    <div className="stat-cards">
                        <StatCard label="Total Submissions" value={stats.totalAttempts.toLocaleString()} color="#818cf8" />
                        <StatCard label="Accepted" value={stats.totalAC.toLocaleString()} color="#4ade80" />
                        <StatCard label="Unique Solved" value={stats.uniqueSolved.toLocaleString()} sub={`of ${stats.uniqueAttempted} attempted`} color="#38bdf8" />
                        <StatCard label="Had Struggles" value={stats.stuckCount.toLocaleString()} sub="problems with ≥1 non-AC attempt" color="#f87171" />
                        <StatCard label="Success Rate" value={`${stats.successRate}%`} color="#fb923c" />
                    </div>
                )}
            </section>

            {!loading && !error && submissions.length > 0 && (
                <>
                    {/* ── Charts ─────────────────────────────────────────────── */}
                    <section className="charts-row">
                        <div className="chart-card">
                            <h3 className="chart-title">Solved by Difficulty</h3>
                            <HBarChart data={diffData} maxVal={diffMax} colorFn={(key) => ratingColor(Number(key))} />
                            {diffData.length === 0 && <div className="chart-empty">No rated problems solved in this period.</div>}
                        </div>
                        <div className="chart-card">
                            <h3 className="chart-title">Top Tags — Solved vs Stuck</h3>
                            <StackedTagChart data={tagData} maxVal={tagMax}
                                onClickStuck={(tag) => setSelectedStuckTag(prev => prev === tag ? null : tag)} />
                            {tagData.length === 0 && <div className="chart-empty">No tag data in this period.</div>}
                        </div>
                    </section>

                    {/* ── Tag Drill-Down Panel ───────────────────────────────── */}
                    {selectedStuckTag && (
                        <section className="tag-drilldown">
                            <div className="drilldown-header">
                                <h2 className="drilldown-title">
                                    🔴 Stuck problems — tag: <span className="tag-highlight">{selectedStuckTag}</span>
                                    <span className="stuck-badge">{stuckTagProblems.length}</span>
                                </h2>
                                <button className="drilldown-close" onClick={() => setSelectedStuckTag(null)}>✕ Close</button>
                            </div>
                            {stuckTagProblems.length === 0
                                ? <div className="chart-empty">No purely-stuck problems for this tag in this period.</div>
                                : (
                                    <div className="stuck-grid">
                                        {stuckTagProblems.map(p => {
                                            const key = `${p.contest_id}_${p.index}`;
                                            const isBookmarked = bookmarkedIds?.has(key);
                                            return (
                                                <div key={key} className="stuck-card">
                                                    <div className="stuck-card-top">
                                                        <span className="stuck-pid">{p.contest_id}{p.index}</span>
                                                        {p.rating && <span className="stuck-rating" style={{ color: ratingColor(p.rating) }}>{p.rating}</span>}
                                                        <span className="stuck-attempts">✗ {p.failCount} fail{p.failCount !== 1 ? 's' : ''}</span>
                                                        <button
                                                            className={`bm-star-btn ${isBookmarked ? 'bookmarked' : ''}`}
                                                            title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                                                            onClick={() => isBookmarked
                                                                ? unbookmark(p.contest_id, p.index)
                                                                : bookmark({ contest_id: p.contest_id, index: p.index, name: p.name, rating: p.rating, tags: p.tags, url: p.url })
                                                            }
                                                        >{isBookmarked ? '★' : '☆'}</button>
                                                    </div>
                                                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="stuck-name">{p.name}</a>
                                                    <div className="stuck-tags">
                                                        {(p.tags || []).slice(0, 4).map(t => <span key={t} className="sub-tag">{t}</span>)}
                                                        {(p.tags || []).length > 4 && <span className="sub-tag more">+{p.tags.length - 4}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            }
                        </section>
                    )}


                    {/* ── Submission History Table ────────────────────────────── */}
                    <section className="sub-table-section">
                        <div className="sub-table-controls">
                            <input className="sub-search" placeholder="Search by problem name…" value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }} />
                            <div className="verdict-filters">
                                {['all', 'ac', 'wa'].map(v => (
                                    <button key={v} className={`vf-btn ${verdictFilter === v ? 'active' : ''}`}
                                        onClick={() => { setVerdictFilter(v); setPage(1); }}>
                                        {v === 'all' ? 'All' : v === 'ac' ? '✓ AC' : '✗ Non-AC'}
                                    </button>
                                ))}
                            </div>
                            <span className="sub-count">{filtered.length.toLocaleString()} submissions</span>
                        </div>

                        <div className="sub-table-header">
                            <div className="sth-verdict sortable-header" onClick={() => handleSort('verdict')}>
                                Verdict <SortIcon columnKey="verdict" sortConfig={sortConfig} />
                            </div>
                            <div className="sth-problem sortable-header" onClick={() => handleSort('problem')}>
                                Problem <SortIcon columnKey="problem" sortConfig={sortConfig} />
                            </div>
                            <div className="sth-rating sortable-header" onClick={() => handleSort('rating')}>
                                Rating <SortIcon columnKey="rating" sortConfig={sortConfig} />
                            </div>
                            <div className="sth-tags">Tags</div>
                            <div className="sth-time sortable-header" onClick={() => handleSort('time_seconds')}>
                                When <SortIcon columnKey="time_seconds" sortConfig={sortConfig} />
                            </div>
                            <div className="sth-bm"></div>
                        </div>

                        <div className="sub-table-body">
                            {paginated.length === 0 ? (
                                <div className="sub-empty-row">No submissions match filters.</div>
                            ) : (
                                paginated.map(sub => {
                                    const isAC = sub.verdict === 'OK';
                                    const verdictLabel = VERDICT_LABEL[sub.verdict] || sub.verdict || '—';
                                    const key = `${sub.problem.contest_id}_${sub.problem.index}`;
                                    const isBookmarked = bookmarkedIds?.has(key);
                                    return (
                                        <div key={sub.id} className={`sub-row ${isAC ? 'ac' : 'wa'}`}>
                                            <div className="sth-verdict">
                                                <span className={`verdict-badge ${isAC ? 'ac' : 'wa'}`}>
                                                    {isAC ? '✓' : '✗'} {verdictLabel}
                                                </span>
                                            </div>
                                            <div className="sth-problem">
                                                <a href={sub.problem.url} target="_blank" rel="noopener noreferrer" className="prob-link">
                                                    <span className="prob-id">{sub.problem.contest_id}{sub.problem.index}</span>
                                                    {sub.problem.name}
                                                </a>
                                            </div>
                                            <div className="sth-rating">
                                                {sub.problem.rating
                                                    ? <span className="rating-chip" style={{ color: ratingColor(sub.problem.rating), borderColor: ratingColor(sub.problem.rating) + '44' }}>{sub.problem.rating}</span>
                                                    : <span className="no-rating">—</span>}
                                            </div>
                                            <div className="sth-tags">
                                                {sub.problem.tags.slice(0, 3).map(t => <span key={t} className="sub-tag">{t}</span>)}
                                                {sub.problem.tags.length > 3 && <span className="sub-tag more">+{sub.problem.tags.length - 3}</span>}
                                            </div>
                                            <div className="sth-time">
                                                <span className="time-ago">{timeAgo(sub.time_seconds)}</span>
                                            </div>
                                            <div className="sth-bm">
                                                <button
                                                    className={`bm-star-btn ${isBookmarked ? 'bookmarked' : ''}`}
                                                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                                                    onClick={() => isBookmarked
                                                        ? unbookmark(sub.problem.contest_id, sub.problem.index)
                                                        : bookmark({ contest_id: sub.problem.contest_id, index: sub.problem.index, name: sub.problem.name, rating: sub.problem.rating, tags: sub.problem.tags, url: sub.problem.url })
                                                    }
                                                >{isBookmarked ? '★' : '☆'}</button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {totalPages > 1 && (
                            <div className="sub-pagination">
                                <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                                <span className="page-info">Page {page} of {totalPages}</span>
                                <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

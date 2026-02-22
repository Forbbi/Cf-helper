import { useState, useEffect } from 'react';
import { getTags } from '../services/api';
import './FilterPanel.css';

export default function FilterPanel({ filters, onChange }) {
    const [allTags, setAllTags] = useState([]);
    const [tagSearch, setTagSearch] = useState('');
    const [tagsLoading, setTagsLoading] = useState(true);

    useEffect(() => {
        getTags().then(d => {
            setAllTags(d.tags);
            setTagsLoading(false);
        }).catch(() => setTagsLoading(false));
    }, []);

    const toggleTag = (tag) => {
        const current = new Set(filters.tags);
        if (current.has(tag)) current.delete(tag);
        else current.add(tag);
        onChange({ ...filters, tags: [...current] });
    };

    const filteredTags = allTags.filter(t =>
        t.toLowerCase().includes(tagSearch.toLowerCase())
    );

    return (
        <div className="filter-panel">
            <div className="filter-section">
                <h3 className="filter-heading">Rating Range</h3>
                <div className="rating-range">
                    <div className="rating-input-group">
                        <label>Min</label>
                        <input
                            type="number"
                            className="rating-input"
                            value={filters.min_rating || ''}
                            placeholder="800"
                            min="0"
                            max="4000"
                            step="100"
                            onChange={e => onChange({ ...filters, min_rating: e.target.value ? parseInt(e.target.value) : null })}
                        />
                    </div>
                    <span className="rating-dash">—</span>
                    <div className="rating-input-group">
                        <label>Max</label>
                        <input
                            type="number"
                            className="rating-input"
                            value={filters.max_rating || ''}
                            placeholder="3500"
                            min="0"
                            max="4000"
                            step="100"
                            onChange={e => onChange({ ...filters, max_rating: e.target.value ? parseInt(e.target.value) : null })}
                        />
                    </div>
                </div>
                <div className="rating-presets">
                    {[[800, 1200, 'Easy'], [1200, 1600, 'Med-'], [1600, 2100, 'Med+'], [2100, 3500, 'Hard']].map(([min, max, label]) => (
                        <button
                            key={label}
                            className={`preset-btn ${filters.min_rating === min && filters.max_rating === max ? 'active' : ''}`}
                            onClick={() => onChange({ ...filters, min_rating: min, max_rating: max })}
                        >{label}</button>
                    ))}
                    <button className="preset-btn clear" onClick={() => onChange({ ...filters, min_rating: null, max_rating: null })}>All</button>
                </div>
            </div>

            <div className="filter-section">
                <h3 className="filter-heading">Tags {filters.tags.length > 0 && <span className="tag-count">{filters.tags.length}</span>}</h3>
                <input
                    className="tag-search"
                    placeholder="Search tags..."
                    value={tagSearch}
                    onChange={e => setTagSearch(e.target.value)}
                />
                {filters.tags.length > 0 && (
                    <div className="selected-tags">
                        {filters.tags.map(t => (
                            <span key={t} className="tag-chip selected" onClick={() => toggleTag(t)}>
                                {t} ×
                            </span>
                        ))}
                    </div>
                )}
                <div className="tags-list">
                    {tagsLoading ? (
                        <div className="tags-loading">Loading...</div>
                    ) : (
                        filteredTags.map(tag => (
                            <button
                                key={tag}
                                className={`tag-item ${filters.tags.includes(tag) ? 'active' : ''}`}
                                onClick={() => toggleTag(tag)}
                            >
                                {tag}
                            </button>
                        ))
                    )}
                </div>
                {filters.tags.length > 0 && (
                    <button className="clear-tags" onClick={() => onChange({ ...filters, tags: [] })}>Clear tags</button>
                )}
            </div>

            <div className="filter-section">
                <h3 className="filter-heading">Status</h3>
                <div className="status-filter">
                    {[['all', 'All'], ['unsolved', 'Unsolved'], ['solved', 'Solved']].map(([v, l]) => (
                        <button
                            key={v}
                            className={`preset-btn ${(filters.status || 'all') === v ? 'active' : ''}`}
                            onClick={() => onChange({ ...filters, status: v })}
                        >{l}</button>
                    ))}
                </div>
            </div>
        </div>
    );
}

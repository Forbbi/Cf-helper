import { useState, useEffect, useRef, memo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import './NoteModal.css';

// ── Lazy-load heavy markdown/katex renderer ──────────────────────────────────
// Only downloaded + parsed when the user first clicks "Preview" tab.
const LazyPreview = lazy(() =>
    import('./NotePreview.jsx')
);

// ── NoteModal ─────────────────────────────────────────────────────────────────
function NoteModal({ problemKey, problemName, anchorRef, onClose }) {
    const storageKey = `note_${problemKey}`;
    const [text, setText] = useState(() => localStorage.getItem(storageKey) || '');
    const textRef = useRef(text);
    useEffect(() => { textRef.current = text; }, [text]);
    
    const [tab, setTab] = useState('write');
    const modalRef = useRef(null);
    const textareaRef = useRef(null);

    // Position the modal near the trigger button
    useEffect(() => {
        if (!anchorRef?.current || !modalRef.current) return;
        const btn = anchorRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let top = btn.bottom + 8;
        let left = btn.right - 380;

        if (left < 8) left = 8;
        if (left + 380 > vw - 8) left = vw - 388;

        const estimatedHeight = 340;
        if (btn.bottom + estimatedHeight > vh) {
            top = btn.top - estimatedHeight - 8;
        }

        modalRef.current.style.top = `${top}px`;
        modalRef.current.style.left = `${left}px`;
    }, [anchorRef]);

    // Auto-focus textarea when on write tab
    useEffect(() => {
        if (tab === 'write') textareaRef.current?.focus();
    }, [tab]);

    const save = () => {
        const currentText = textRef.current;
        if (currentText.trim()) localStorage.setItem(storageKey, currentText);
        else localStorage.removeItem(storageKey);
        onClose();
    };

    const clear = () => {
        localStorage.removeItem(storageKey);
        onClose();
    };

    // Close on outside click or Escape — attached once
    useEffect(() => {
        const onMouse = (e) => {
            if (
                modalRef.current && !modalRef.current.contains(e.target) &&
                anchorRef?.current && !anchorRef.current.contains(e.target)
            ) save();
        };
        const onKey = (e) => { if (e.key === 'Escape') save(); };
        
        document.addEventListener('mousedown', onMouse);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onMouse);
            document.removeEventListener('keydown', onKey);
        };
    }, []); // Empty dependency array so it only binds once

    const modal = (
        <div className="note-modal" ref={modalRef} role="dialog" aria-label="Problem note">
            {/* Header */}
            <div className="note-modal-header">
                <span className="note-modal-icon">📝</span>
                <span className="note-modal-title" title={problemName}>{problemName}</span>
                <button className="note-modal-close" onClick={save}>✕</button>
            </div>

            {/* Tabs */}
            <div className="note-tabs">
                <button className={`note-tab ${tab === 'write' ? 'active' : ''}`} onClick={() => setTab('write')}>
                    ✏️ Write
                </button>
                <button className={`note-tab ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')}>
                    👁 Preview
                </button>
                <span className="note-tab-hint">Markdown + LaTeX</span>
            </div>

            {/* Write */}
            {tab === 'write' && (
                <textarea
                    ref={textareaRef}
                    className="note-modal-textarea"
                    placeholder={`Notes here — Markdown & LaTeX supported\n**bold**  _italic_  \`code\`\n$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$`}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={8}
                />
            )}

            {/* Preview — loaded lazily, only when tab is clicked */}
            {tab === 'preview' && (
                <Suspense fallback={<div className="note-preview-loading">Rendering…</div>}>
                    <LazyPreview text={text} />
                </Suspense>
            )}

            {/* Footer */}
            <div className="note-modal-footer">
                <button className="note-btn-clear" onClick={clear}>Clear</button>
                <button className="note-btn-save" onClick={save}>Save & Close</button>
            </div>
        </div>
    );

    // Render outside DOM tree via portal → no layout reflows in table rows
    return createPortal(modal, document.body);
}

// ── NoteButton ────────────────────────────────────────────────────────────────
// memo() prevents re-renders when parent table re-renders (e.g. sort/filter)
export const NoteButton = memo(function NoteButton({ problemKey, problemName }) {
    const [open, setOpen] = useState(false);
    const [noted, setNoted] = useState(() => !!localStorage.getItem(`note_${problemKey}`));
    const btnRef = useRef(null);

    const toggle = (e) => {
        e.stopPropagation();
        setOpen(p => !p);
    };

    const handleClose = () => {
        setOpen(false);
        setNoted(!!localStorage.getItem(`note_${problemKey}`));
    };

    return (
        <>
            <button
                ref={btnRef}
                className={`note-icon-btn ${noted ? 'has-note' : ''}`}
                title={noted ? 'View/edit note' : 'Add note'}
                onClick={toggle}
                aria-pressed={open}
            >
                📝
            </button>
            {open && (
                <NoteModal
                    problemKey={problemKey}
                    problemName={problemName}
                    anchorRef={btnRef}
                    onClose={handleClose}
                />
            )}
        </>
    );
});

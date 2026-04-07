// This file is lazy-loaded — react-markdown, remark-math, rehype-katex
// are only downloaded + parsed when the user first opens the Preview tab.
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const remarkPlugins = [remarkMath];
const rehypePlugins = [rehypeKatex];

export default function NotePreview({ text }) {
    if (!text?.trim()) {
        return (
            <div className="note-preview">
                <p className="note-preview-empty">
                    Nothing to preview yet. Switch to Write and add some notes.
                </p>
            </div>
        );
    }

    return (
        <div className="note-preview">
            <ReactMarkdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
            >
                {text}
            </ReactMarkdown>
        </div>
    );
}

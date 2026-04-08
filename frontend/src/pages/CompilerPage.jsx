import { useState, useRef } from 'react';
import './CompilerPage.css';

const API_URL = '/api/compile';

const DEFAULT_CODE = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    cin >> n;
    cout << "Hello from C++! n = " << n << endl;

    return 0;
}`;

export default function CompilerPage() {
    const [code, setCode] = useState(DEFAULT_CODE);
    const [input, setInput] = useState('5');
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');
    const [running, setRunning] = useState(false);
    const [meta, setMeta] = useState(null);
    const codeRef = useRef(null);

    const runCode = async () => {
        setRunning(true);
        setOutput('');
        setError('');
        setMeta(null);

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    compiler: 'g++-15',
                    code,
                    input,
                }),
            });

            // Read body as text first so we never crash on empty/non-JSON responses
            const text = await res.text();
            if (!res.ok) {
                setError(`Server error ${res.status}: ${text || '(empty response)'}`);
                setRunning(false);
                return;
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch {
                setError(`Unexpected response from server:\n${text}`);
                setRunning(false);
                return;
            }

            if (data.error) setError(data.error);
            setOutput(data.output || '');
            setMeta({
                status: data.status,
                exit_code: data.exit_code,
                time: data.time,
                memory: data.memory,
            });
        } catch (e) {
            setError('Request failed: ' + e.message);
        } finally {
            setRunning(false);
        }
    };

    const handleKeyDown = (e) => {
        // Tab inserts 4 spaces instead of losing focus
        if (e.key === 'Tab') {
            e.preventDefault();
            const ta = codeRef.current;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const newCode = code.substring(0, start) + '    ' + code.substring(end);
            setCode(newCode);
            setTimeout(() => {
                ta.selectionStart = ta.selectionEnd = start + 4;
            }, 0);
        }
        // Ctrl/Cmd + Enter runs
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            runCode();
        }
    };

    return (
        <div className="compiler-page">
            <div className="compiler-header">
                <h1 className="page-title">Compiler</h1>
                <p className="compiler-subtitle">C++23 · g++-15 · Online</p>
                <div className="compiler-run-wrap">
                    <span className="run-hint">⌘↵</span>
                    <button
                        className={`run-btn ${running ? 'running' : ''}`}
                        onClick={runCode}
                        disabled={running}
                    >
                        {running ? (
                            <><span className="run-spinner" /> Compiling…</>
                        ) : (
                            <>▶ Run</>
                        )}
                    </button>
                </div>
            </div>

            <div className="compiler-body">
                {/* ── Left: Stdin + Output ── */}
                <div className="compiler-panel layout-left">
                    {/* Stdin */}
                    <div className="stdin-wrap flex-half">
                        <div className="panel-bar">
                            <span className="panel-title">Input</span>
                            <div className="panel-actions">
                                <button className="action-btn" onClick={() => setInput('')}>Clear</button>
                            </div>
                        </div>
                        <textarea
                            className="stdin-editor"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Input for your program... (e.g. 5)"
                            spellCheck={false}
                        />
                    </div>

                    {/* Output */}
                    <div className="output-wrap flex-half">
                        <div className="panel-bar">
                            <span className="panel-title">Output</span>
                            {meta && (
                                <div className="output-meta">
                                    <span className={`status-badge ${meta.exit_code === 0 ? 'ok' : 'err'}`}>
                                        {meta.exit_code === 0 ? '✓ OK' : '✗ Error'}
                                    </span>
                                    <span className="meta-item">⏱ {meta.time}s</span>
                                    <span className="meta-item">💾 {Math.round(meta.memory / 1024)}KB</span>
                                </div>
                            )}
                        </div>
                        <pre className={`output-content ${error ? 'has-error' : ''}`}>
                            {running && <span className="output-running">Running…</span>}
                            {!running && error && <span className="output-error">{error}</span>}
                            {!running && !error && output && output}
                            {!running && !error && !output && <span className="output-placeholder">Output will appear here after you run the code.</span>}
                        </pre>
                    </div>
                </div>

                {/* ── Right: Code Editor ── */}
                <div className="compiler-panel layout-right">
                    <div className="editor-wrap">
                        <div className="panel-bar">
                            <span className="panel-title">main.cpp</span>
                            <div className="panel-actions">
                                <button className="action-btn action-run" onClick={runCode} disabled={running}>
                                    {running ? 'Running...' : '▶ Run'}
                                </button>
                                <button className="action-btn" onClick={() => setCode('')}>Clear</button>
                            </div>
                        </div>
                        <div className="editor-inner">
                            <div className="line-numbers">
                                {code.split('\n').map((_, i) => (
                                    <span key={i}>{i + 1}</span>
                                ))}
                            </div>
                            <textarea
                                ref={codeRef}
                                className="code-editor"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                onKeyDown={handleKeyDown}
                                spellCheck={false}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

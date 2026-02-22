#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CFTracker — starting backend + frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Backend ────────────────────────────────────────────────────────────────────
if [ ! -d "$BACKEND/venv" ]; then
    echo "⚙  Creating Python virtual environment..."
    python3 -m venv "$BACKEND/venv"
fi

echo "📦 Installing backend dependencies..."
"$BACKEND/venv/bin/pip" install -r "$BACKEND/requirements.txt" -q

echo "🚀 Starting backend on http://localhost:8000"
# Use venv's uvicorn binary directly so subprocesses inherit the right environment
cd "$BACKEND"
"$BACKEND/venv/bin/uvicorn" main:app --reload --port 8000 &
BACKEND_PID=$!

# ── Frontend ───────────────────────────────────────────────────────────────────
cd "$FRONTEND"

if [ ! -d "$FRONTEND/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install --silent
fi

echo "🚀 Starting frontend on http://localhost:5173"
npm run dev &
FRONTEND_PID=$!

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "✅  CFTracker is running!"
echo "   🌐 Frontend → http://localhost:5173"
echo "   🔧 Backend  → http://localhost:8000"
echo ""
echo "   Press Ctrl+C to stop both servers."
echo ""

# ── Cleanup on Ctrl+C ──────────────────────────────────────────────────────────
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; wait $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Done.'; exit 0" INT TERM

wait

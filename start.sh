#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CFTracker — starting backend + frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Backend ────────────────────────────────────────────────────────────────────
echo "📦 Installing backend dependencies with uv..."
uv sync -q

echo "🚀 Starting backend on http://localhost:8000"
cd "$BACKEND"
uv run python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# ── Frontend ───────────────────────────────────────────────────────────────────
cd "$FRONTEND"

if [ ! -d "$FRONTEND/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install --silent
fi

echo "🚀 Starting frontend on http://localhost:5173"
npm run dev -- --host &
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

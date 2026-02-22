#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CFTracker — starting backend + frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Backend ────────────────────────────────────────────────────────────────────
cd "$ROOT/backend"

if [ ! -d "venv" ]; then
    echo "⚙  Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
echo "📦 Installing backend dependencies..."
pip install -r requirements.txt -q
echo "🚀 Starting backend on http://localhost:8000"
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
deactivate

# ── Frontend ───────────────────────────────────────────────────────────────────
cd "$ROOT/frontend"

if [ ! -d "node_modules" ]; then
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

# ── Cleanup on exit ────────────────────────────────────────────────────────────
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; wait $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Done.'; exit 0" INT TERM

wait

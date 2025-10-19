#!/bin/bash
# scripts/stop_local.sh
# Script to stop all running services

echo "⏹️  Stopping Mental Health App Backend..."
echo ""

if [ -f .pids ]; then
    while read pid; do
        if ps -p $pid > /dev/null; then
            echo "   Stopping process $pid..."
            kill $pid
        fi
    done < .pids
    rm .pids
    echo "✅ All services stopped"
else
    echo "⚠️  No .pids file found. Searching for processes..."
    
    # Kill by port
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    lsof -ti:8001 | xargs kill -9 2>/dev/null
    
    echo "✅ Processes on ports 8000 and 8001 terminated"
fi

echo ""
echo "🧹 Cleanup complete"
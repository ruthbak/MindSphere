#!/bin/bash
# scripts/run_local.sh
# Script to run both servers locally for development

echo "🚀 Starting Mental Health App Backend..."
echo ""

# Check if MongoDB is running
echo "📊 Checking MongoDB..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB not running. Please start MongoDB first:"
    echo "   mongod --dbpath /path/to/data"
    exit 1
fi
echo "✅ MongoDB is running"
echo ""

# Start Model Server in background
echo "🧠 Starting Model Server on port 8001..."
cd model_server
source venv/bin/activate 2>/dev/null || python -m venv venv && source venv/bin/activate
pip install -q -r requirements.txt
python main.py > ../logs/model_server.log 2>&1 &
MODEL_SERVER_PID=$!
echo "✅ Model Server started (PID: $MODEL_SERVER_PID)"
echo "   Logs: logs/model_server.log"
echo "   Note: First run will download models (~1.5GB)"
cd ..
echo ""

# Wait for model server to be ready
echo "⏳ Waiting for Model Server to load..."
sleep 10

# Check if model server is responding
if curl -s http://localhost:8001/health > /dev/null; then
    echo "✅ Model Server is ready"
else
    echo "⚠️  Model Server may still be loading models..."
fi
echo ""

# Start Railway API
echo "🌐 Starting Railway API on port 8000..."
cd railway_api
source venv/bin/activate 2>/dev/null || python -m venv venv && source venv/bin/activate
pip install -q -r requirements.txt
python main.py > ../logs/railway_api.log 2>&1 &
RAILWAY_API_PID=$!
echo "✅ Railway API started (PID: $RAILWAY_API_PID)"
echo "   Logs: logs/railway_api.log"
cd ..
echo ""

# Wait for railway API to be ready
echo "⏳ Waiting for Railway API to start..."
sleep 5

if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Railway API is ready"
else
    echo "❌ Railway API failed to start. Check logs/railway_api.log"
    kill $MODEL_SERVER_PID $RAILWAY_API_PID
    exit 1
fi

echo ""
echo "🎉 All services are running!"
echo ""
echo "📍 Service URLs:"
echo "   Railway API: http://localhost:8000"
echo "   Model Server: http://localhost:8001"
echo "   API Docs: http://localhost:8000/docs"
echo "   Model Docs: http://localhost:8001/docs"
echo ""
echo "🔧 To expose Model Server with ngrok:"
echo "   ngrok http 8001"
echo ""
echo "⏹️  To stop all services:"
echo "   kill $RAILWAY_API_PID $MODEL_SERVER_PID"
echo "   Or use: scripts/stop_local.sh"
echo ""
echo "📝 Process IDs saved to .pids"
echo "$RAILWAY_API_PID" > .pids
echo "$MODEL_SERVER_PID" >> .pids

# Keep script running and show logs
echo "📋 Tailing logs (Ctrl+C to exit)..."
echo ""
tail -f logs/railway_api.log logs/model_server.log
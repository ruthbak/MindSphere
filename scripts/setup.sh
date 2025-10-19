#!/bin/bash
# scripts/setup.sh
# Initial setup script for the Mental Health App backend

echo "🏥 Mental Health App - Backend Setup"
echo "===================================="
echo ""

# Check Python version
echo "📋 Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "   Found Python $python_version"

if ! python3 -c 'import sys; exit(0 if sys.version_info >= (3, 9) else 1)'; then
    echo "❌ Python 3.9+ required. Please upgrade Python."
    exit 1
fi
echo "✅ Python version OK"
echo ""

# Check MongoDB
echo "📊 Checking MongoDB..."
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB installed"
else
    echo "⚠️  MongoDB not found locally. You can use MongoDB Atlas instead."
    echo "   Sign up at: https://www.mongodb.com/cloud/atlas"
fi
echo ""

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p railway_api/routes
mkdir -p model_server/models
mkdir -p logs
mkdir -p scripts
touch railway_api/__init__.py
touch railway_api/routes/__init__.py
echo "✅ Directories created"
echo ""

# Setup Railway API
echo "🚂 Setting up Railway API..."
cd railway_api
if [ ! -d "venv" ]; then
    echo "   Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
echo "   Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "✅ Railway API setup complete"
cd ..
echo ""

# Setup Model Server
echo "🧠 Setting up Model Server..."
cd model_server
if [ ! -d "venv" ]; then
    echo "   Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
echo "   Installing dependencies (this may take a while)..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "✅ Model Server setup complete"
echo ""
echo "⚠️  Note: AI models will download on first run (~1.5GB)"
cd ..
echo ""

# Create .env file
echo "⚙️  Creating environment configuration..."
if [ ! -f "railway_api/.env" ]; then
    cp railway_api/.env.example railway_api/.env
    echo "✅ Created railway_api/.env - Please update with your configuration"
else
    echo "ℹ️  railway_api/.env already exists"
fi
echo ""

# Check for LLaMA model
echo "🤖 Checking for LLaMA model..."
if [ -f "model_server/models/llama-2-7b-chat.Q4_K_M.gguf" ]; then
    echo "✅ LLaMA model found"
else
    echo "⚠️  LLaMA model not found"
    echo "   Please place llama-2-7b-chat.Q4_K_M.gguf in:"
    echo "   model_server/models/llama-2-7b-chat.Q4_K_M.gguf"
fi
echo ""

# Install ngrok if needed
echo "🌐 Checking ngrok..."
if command -v ngrok &> /dev/null; then
    echo "✅ ngrok installed"
else
    echo "⚠️  ngrok not found"
    echo "   Download from: https://ngrok.com/download"
    echo "   Required to expose Model Server to Railway"
fi
echo ""

echo "✨ Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Update railway_api/.env with your MongoDB URL"
echo "2. Place LLaMA model in model_server/models/"
echo "3. Start MongoDB (or use MongoDB Atlas)"
echo "4. Run: ./scripts/run_local.sh"
echo "5. In another terminal, run: ngrok http 8001"
echo "6. Update MODEL_SERVER_URL in Railway with ngrok URL"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Deployment guide"
echo "   - TESTING_GUIDE.md - Testing walkthrough"
echo "   - example_requests.http - API examples"
echo ""
echo "🚀 Ready for hackathon! Good luck!"
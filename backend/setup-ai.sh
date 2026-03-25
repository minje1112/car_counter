#!/bin/bash
# AI Car Counting Setup Script for Linux/Mac
# Run with: chmod +x setup-ai.sh && ./setup-ai.sh

echo "========================================"
echo "  AI Car Counting Setup"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${YELLOW}Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    echo -e "${GREEN}✓ Node.js installed: $(node --version)${NC}"
else
    echo -e "${RED}✗ Node.js not found! Install from https://nodejs.org${NC}"
    exit 1
fi

# Check Python
echo -e "${YELLOW}Checking Python...${NC}"
if command -v python3 &> /dev/null; then
    echo -e "${GREEN}✓ Python installed: $(python3 --version)${NC}"
else
    echo -e "${RED}✗ Python not found! Install from https://www.python.org${NC}"
    exit 1
fi

# Check FFmpeg
echo -e "${YELLOW}Checking FFmpeg...${NC}"
if command -v ffmpeg &> /dev/null; then
    echo -e "${GREEN}✓ FFmpeg installed${NC}"
else
    echo -e "${YELLOW}⚠ FFmpeg not found${NC}"
    echo -e "${YELLOW}  Install with: sudo apt-get install ffmpeg${NC}"
fi

# Check Redis
echo -e "${YELLOW}Checking Redis...${NC}"
if redis-cli ping &> /dev/null; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${YELLOW}⚠ Redis not running${NC}"
    echo -e "${YELLOW}  Start with: redis-server${NC}"
fi

echo ""
echo "========================================"
echo "  Installing Dependencies"
echo "========================================"
echo ""

# Install Node dependencies
echo -e "${YELLOW}Installing Node.js packages...${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Node.js packages installed${NC}"
else
    echo -e "${RED}✗ Failed to install Node.js packages${NC}"
    exit 1
fi

# Install Python dependencies
echo -e "${YELLOW}Installing Python packages...${NC}"
cd workers
pip3 install -r requirements.txt
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Python packages installed${NC}"
else
    echo -e "${RED}✗ Failed to install Python packages${NC}"
    cd ..
    exit 1
fi
cd ..

# Create temp directory
echo -e "${YELLOW}Creating temp directory...${NC}"
mkdir -p assets/temp
echo -e "${GREEN}✓ Temp directory created${NC}"

# Create logs directory
echo -e "${YELLOW}Creating logs directory...${NC}"
mkdir -p logs
echo -e "${GREEN}✓ Logs directory created${NC}"

# Check .env file
echo -e "${YELLOW}Checking .env file...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo -e "${YELLOW}  Please create .env file with required configuration${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Install PM2
echo -e "${YELLOW}Checking PM2...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✓ PM2 installed: $(pm2 --version)${NC}"
else
    echo -e "${YELLOW}Installing PM2...${NC}"
    npm install -g pm2
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PM2 installed${NC}"
    else
        echo -e "${YELLOW}⚠ PM2 installation failed (optional)${NC}"
    fi
fi

echo ""
echo "========================================"
echo "  Database Setup"
echo "========================================"
echo ""
echo -e "${YELLOW}⚠ Please run the database migration:${NC}"
echo "  mysql -u root -p annotation_db < migrations/add_ai_features.sql"
echo ""

echo "========================================"
echo -e "${GREEN}  Setup Complete!${NC}"
echo "========================================"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Configure .env file with database and Redis settings"
echo "  2. Run database migration (see above)"
echo "  3. Start Redis server"
echo "  4. Start the system:"
echo ""
echo -e "${CYAN}     Development:${NC}"
echo "       Terminal 1: npm run dev"
echo "       Terminal 2: npm run worker"
echo ""
echo -e "${CYAN}     Production:${NC}"
echo "       pm2 start ecosystem.config.js"
echo "       pm2 logs"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo "  - Complete Guide: docs/AI_CAR_COUNTING_GUIDE.md"
echo "  - Quick Start: docs/QUICK_START_AI.md"
echo "  - Worker Info: workers/README.md"
echo ""

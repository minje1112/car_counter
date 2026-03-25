# AI Car Counting Setup Script
# Run with: powershell -ExecutionPolicy Bypass -File setup-ai.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI Car Counting Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found! Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check Python
Write-Host "Checking Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>$null
if ($pythonVersion) {
    Write-Host "✓ Python installed: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Python not found! Install from https://www.python.org" -ForegroundColor Red
    exit 1
}

# Check FFmpeg
Write-Host "Checking FFmpeg..." -ForegroundColor Yellow
$ffmpegVersion = ffmpeg -version 2>$null
if ($ffmpegVersion) {
    Write-Host "✓ FFmpeg installed" -ForegroundColor Green
} else {
    Write-Host "⚠ FFmpeg not found in PATH" -ForegroundColor Yellow
    Write-Host "  Download from: https://www.gyan.dev/ffmpeg/builds/" -ForegroundColor Yellow
}

# Check Redis
Write-Host "Checking Redis..." -ForegroundColor Yellow
$redisTest = redis-cli ping 2>$null
if ($redisTest -eq "PONG") {
    Write-Host "✓ Redis is running" -ForegroundColor Green
} else {
    Write-Host "⚠ Redis not running" -ForegroundColor Yellow
    Write-Host "  Start with: docker run -d -p 6379:6379 redis:latest" -ForegroundColor Yellow
    Write-Host "  Or download from: https://github.com/microsoftarchive/redis/releases" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installing Dependencies" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Install Node dependencies
Write-Host "Installing Node.js packages..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Node.js packages installed" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install Node.js packages" -ForegroundColor Red
    exit 1
}

# Install Python dependencies
Write-Host "Installing Python packages..." -ForegroundColor Yellow
Set-Location workers
pip install -r requirements.txt
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Python packages installed" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install Python packages" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# Create temp directory
Write-Host "Creating temp directory..." -ForegroundColor Yellow
$tempDir = "assets\temp"
if (!(Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    Write-Host "✓ Temp directory created: $tempDir" -ForegroundColor Green
} else {
    Write-Host "✓ Temp directory exists" -ForegroundColor Green
}

# Create logs directory
Write-Host "Creating logs directory..." -ForegroundColor Yellow
$logsDir = "logs"
if (!(Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    Write-Host "✓ Logs directory created: $logsDir" -ForegroundColor Green
} else {
    Write-Host "✓ Logs directory exists" -ForegroundColor Green
}

# Check .env file
Write-Host "Checking .env file..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Write-Host "⚠ .env file not found" -ForegroundColor Yellow
    Write-Host "  Please create .env file with required configuration" -ForegroundColor Yellow
    Write-Host "  See .env.example for template" -ForegroundColor Yellow
} else {
    Write-Host "✓ .env file exists" -ForegroundColor Green
}

# Install PM2
Write-Host "Checking PM2..." -ForegroundColor Yellow
$pm2Version = pm2 --version 2>$null
if ($pm2Version) {
    Write-Host "✓ PM2 installed: $pm2Version" -ForegroundColor Green
} else {
    Write-Host "Installing PM2..." -ForegroundColor Yellow
    npm install -g pm2
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ PM2 installed" -ForegroundColor Green
    } else {
        Write-Host "⚠ PM2 installation failed (optional)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Database Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠ Please run the database migration:" -ForegroundColor Yellow
Write-Host "  mysql -u root -p annotation_db < migrations\add_ai_features.sql" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Configure .env file with database and Redis settings" -ForegroundColor White
Write-Host "  2. Run database migration (see above)" -ForegroundColor White
Write-Host "  3. Start Redis server" -ForegroundColor White
Write-Host "  4. Start the system:" -ForegroundColor White
Write-Host ""
Write-Host "     Development:" -ForegroundColor Cyan
Write-Host "       Terminal 1: npm run dev" -ForegroundColor White
Write-Host "       Terminal 2: npm run worker" -ForegroundColor White
Write-Host ""
Write-Host "     Production:" -ForegroundColor Cyan
Write-Host "       pm2 start ecosystem.config.js" -ForegroundColor White
Write-Host "       pm2 logs" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  - Complete Guide: docs\AI_CAR_COUNTING_GUIDE.md" -ForegroundColor White
Write-Host "  - Quick Start: docs\QUICK_START_AI.md" -ForegroundColor White
Write-Host "  - Worker Info: workers\README.md" -ForegroundColor White
Write-Host ""

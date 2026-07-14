@echo off
title Mharat Iraq - Backend Server
echo ------------------------------------------------------------
echo Starting Mharat Iraq Backend Server...
echo ------------------------------------------------------------

:: Load environment variables from .env
if exist .env (
    echo Loading configurations from .env...
    for /f "tokens=*" %%i in ('findstr /v "^#" .env') do set %%i
) else (
    echo WARNING: .env file not found! Create a .env file with required secrets.
    echo See .env.example or documentation for required variables.
    exit /b 1
)

echo PORT: %PORT%

echo.
echo Step 1: Seeding Firebase Realtime Database...
call npx pnpm --filter @workspace/scripts run seed

echo.
echo Step 2: Building API Server...
call npx pnpm --filter @workspace/api-server run build

echo.
echo Step 3: Starting Server on port %PORT%...
call npx pnpm --filter @workspace/api-server run start

pause

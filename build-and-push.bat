@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   KANAB Motors - Build and Push to Docker Hub
echo ========================================================

set DOCKER_USER=%1

if "%DOCKER_USER%"=="" (
    set /p DOCKER_USER="Enter your Docker Hub Username: "
)

if "%DOCKER_USER%"=="" (
    echo [ERROR] Docker Hub username cannot be empty.
    exit /b 1
)

echo.
echo [1/5] Checking Docker Hub Authentication...
docker login
if errorlevel 1 (
    echo [ERROR] Docker login failed. Please ensure Docker Desktop is running and credentials are valid.
    exit /b 1
)

echo.
echo [2/5] Building Backend Image (%DOCKER_USER%/kanab-backend:latest)...
docker build -t %DOCKER_USER%/kanab-backend:latest -t %DOCKER_USER%/kanab-backend:v1.0.0 ./backend
if errorlevel 1 (
    echo [ERROR] Backend build failed.
    exit /b 1
)

echo.
echo [3/5] Building Frontend Image (%DOCKER_USER%/kanab-frontend:latest)...
docker build -t %DOCKER_USER%/kanab-frontend:latest -t %DOCKER_USER%/kanab-frontend:v1.0.0 ./frontend
if errorlevel 1 (
    echo [ERROR] Frontend build failed.
    exit /b 1
)

echo.
echo [4/5] Pushing Backend Image to Docker Hub...
docker push %DOCKER_USER%/kanab-backend:latest
docker push %DOCKER_USER%/kanab-backend:v1.0.0
if errorlevel 1 (
    echo [ERROR] Failed to push backend image.
    exit /b 1
)

echo.
echo [5/5] Pushing Frontend Image to Docker Hub...
docker push %DOCKER_USER%/kanab-frontend:latest
docker push %DOCKER_USER%/kanab-frontend:v1.0.0
if errorlevel 1 (
    echo [ERROR] Failed to push frontend image.
    exit /b 1
)

echo.
echo ========================================================
echo   SUCCESS! Both images pushed to Docker Hub!
echo   - %DOCKER_USER%/kanab-backend:latest
echo   - %DOCKER_USER%/kanab-frontend:latest
echo ========================================================
echo.
echo Next step on your Hostinger VPS:
echo 1. Connect via SSH: ssh root@69.62.109.18
echo 2. Run the deploy script or docker-compose command.
echo ========================================================

@echo off
echo 🚀 Setting up for deployment...

:: Create .env file for production
echo NODE_ENV=production > .env
echo PORT=3000 >> .env
echo HOST=0.0.0.0 >> .env

:: Update .gitignore
echo. >> .gitignore
echo # Environment variables >> .gitignore
echo .env >> .gitignore
echo .env.local >> .gitignore
echo .env.production >> .gitignore
echo. >> .gitignore
echo # Keep deployment configs >> .gitignore
echo !railway.json >> .gitignore
echo !render.yaml >> .gitignore
echo !DEPLOYMENT.md >> .gitignore

echo ✅ Deployment setup complete!
echo.
echo 📋 Next steps:
echo 1. Push to GitHub: git add . && git commit -m "Deploy ready" && git push
echo 2. Connect to Railway/Render/Cyclic
echo 3. Add environment variables if needed
echo 4. Deploy! 🎉

pause

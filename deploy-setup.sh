#!/bin/bash

echo "🚀 Setting up for deployment..."

# Create .env file for production
cat > .env << EOL
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
EOL

# Update .gitignore to include .env but allow deployment configs
cat >> .gitignore << EOL

# Environment variables
.env
.env.local
.env.production

# Keep deployment configs
!railway.json
!render.yaml
!DEPLOYMENT.md
EOL

echo "✅ Deployment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Push to GitHub: git add . && git commit -m 'Deploy ready' && git push"
echo "2. Connect to Railway/Render/Cyclic"
echo "3. Add environment variables if needed"
echo "4. Deploy! 🎉"

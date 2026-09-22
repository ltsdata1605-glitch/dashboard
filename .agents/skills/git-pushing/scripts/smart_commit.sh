#!/bin/bash
set -e

# Default commit message if none provided
MESSAGE="${1:-chore: update code and deploy live}"

# 1. Add all changes
git add -A

# 2. Commit with the provided message
git commit -m "$MESSAGE" || echo "No changes to commit"

# 3. Get current branch name and push to remote
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push -u origin "$BRANCH"
echo "✅ Pushed changes to GitHub branch $BRANCH"

# 4. Build web production bundle
echo "📦 Building web app for production..."
npm run build

# 5. Deploy web live to https://dashboard.pro.vn/ (gh-pages)
echo "🌐 Deploying live web to https://dashboard.pro.vn/..."
npx gh-pages -d dist
echo "✅ Deployed live web to https://dashboard.pro.vn/!"

# 6. Deploy Firebase Cloud Functions live
echo "⚡ Deploying Firebase Functions live..."
npm run deploy:functions
echo "✅ Deployed Firebase Functions live!"

echo "🎉 All deployments completed successfully!"


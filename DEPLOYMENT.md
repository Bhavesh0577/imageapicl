# 🚀 Free Deployment Guide for SVG Images API

## Quick Deploy Options (Choose One):

### 1. **Railway** ⭐ (Recommended)

**Why Railway?** Free tier + persistent storage for your SVG files

**Steps:**

1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Add these environment variables:
   - `PORT`: (auto-set)
   - `NODE_ENV`: `production`
4. Add a **Volume** for persistent storage:
   - Mount Path: `/app/uploads`
   - Size: 1GB (free)

**Deploy Command:**

```bash
# Push to GitHub, then Railway auto-deploys
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. **Render** 🎯

**Why Render?** Simple setup + free persistent disk

**Steps:**

1. Create account at [render.com](https://render.com)
2. Connect GitHub repository
3. Use the included `render.yaml` for auto-config
4. Set environment variables:
   - `NODE_ENV`: `production`

### 3. **Cyclic** 💡

**Why Cyclic?** Dead simple, good for small projects

**Steps:**

1. Go to [cyclic.sh](https://cyclic.sh)
2. Connect GitHub
3. Auto-deploys with built-in storage

### 4. **Glitch** 🎨

**Why Glitch?** Instant deploy, community-friendly

**Steps:**

1. Go to [glitch.com](https://glitch.com)
2. Import from GitHub
3. Auto-handles everything

## 📋 Pre-Deployment Checklist:

### ✅ Already Done:

- [x] Added Node.js version in `package.json`
- [x] Set HOST to `0.0.0.0` for cloud compatibility
- [x] Created deployment configs (`railway.json`, `render.yaml`)
- [x] Environment-friendly port handling

### 🔧 Optional Enhancements:

**Add Health Check:**

```javascript
// Add this route to server.js
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});
```

**Add Production CORS:**

```javascript
// Replace current CORS config
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production" ? ["https://yourdomain.com"] : true,
  })
);
```

## 🌐 After Deployment:

Your API will be available at something like:

- Railway: `https://your-app-name.railway.app`
- Render: `https://your-app-name.onrender.com`
- Cyclic: `https://your-app-name.cyclic.app`

**Update your frontend URLs to use the deployed URL:**

```javascript
const API_BASE = "https://your-deployed-app.railway.app";
```

## 💰 Cost Breakdown (All FREE tiers):

| Platform | Monthly Limits     | Storage    | Sleep Policy       |
| -------- | ------------------ | ---------- | ------------------ |
| Railway  | 500hrs + $5 credit | 1GB Volume | No sleep           |
| Render   | 750hrs             | 1GB Disk   | Sleeps after 15min |
| Cyclic   | Always on          | Built-in   | No sleep           |
| Glitch   | 1000hrs            | 200MB      | Sleeps after 5min  |

## 🏆 **Recommendation:**

**For your SVG API:** Use **Railway** or **Render**

- Both have persistent storage (crucial for your uploaded SVGs)
- Good free tiers
- Easy GitHub integration
- No complex setup required

**Quick Start:** Push your code to GitHub, then connect to Railway - it'll be live in 2 minutes! 🚀

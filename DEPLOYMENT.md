# 🚀 GitHub Pages Deployment Guide

This guide explains how to deploy the Proc Grapher frontend to GitHub Pages using the automated CI/CD pipeline.

## 📁 Files Created

### GitHub Actions Workflows
- `.github/workflows/deploy-pages.yml` - Automated deployment to GitHub Pages
- `.github/workflows/test-build.yml` - PR testing and validation

### Configuration Updates
- `frontend/vite.config.js` - Optimized for GitHub Pages with proper base URL
- `README.md` - Updated with deployment instructions and badges

## 🔧 How It Works

### Automatic Deployment
1. **Trigger**: Push to `main` branch with frontend changes
2. **Build**: GitHub Actions runs `npm ci` and `npm run build`
3. **Deploy**: Built files uploaded to `gh-pages` branch
4. **Live**: Site available at `https://username.github.io/proc-grapher/`

### Pull Request Testing
1. **Trigger**: Any PR targeting `main` branch
2. **Test**: Validates frontend builds correctly
3. **Status**: PR checks show build status

## 🛠️ Setup Instructions

### 1. Repository Setup
```bash
# Push your code to GitHub
git add .
git commit -m "Add GitHub Pages deployment pipeline"
git push origin main
```

### 2. Enable GitHub Pages
1. Go to repository **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **gh-pages** (will be created automatically)
4. Folder: **/ (root)**
5. Click **Save**

### 3. Configure Repository Name (if different)
```javascript
// In frontend/vite.config.js, update the base URL:
const base = mode === 'production' ? '/your-repo-name/' : '/'
```

### 4. First Deployment
- Push to `main` branch (triggers automatic deployment)
- Or go to **Actions** tab and run "Deploy Frontend to GitHub Pages" manually

## 🌐 Usage

### Accessing the Deployed Frontend
- **URL**: `https://yourusername.github.io/proc-grapher/`
- **Features**: Full client functionality, IP configuration, Chart.js visualizations

### Connecting to Backends
1. Open the GitHub Pages URL
2. Enter backend details:
   - **Host**: Any server IP or domain (e.g., `192.168.1.100`, `your-server.com`)
   - **Port**: Backend port (default: `8000`)
3. Click **Connect**
4. Monitor any system remotely!

## 📊 Monitoring Different Systems

### Local Development Server
```bash
# Start backend locally
cd backend && poetry run uvicorn main:app --host 0.0.0.0 --port 8000

# Connect from GitHub Pages
# Host: localhost or your-machine-ip
# Port: 8000
```

### Remote Production Server
```bash
# Deploy backend on server
poetry run uvicorn main:app --host 0.0.0.0 --port 8000

# Connect from GitHub Pages
# Host: server-ip-or-domain
# Port: 8000
```

### Docker Container
```bash
# Run backend in Docker
docker run -p 8000:8000 proc-grapher-backend

# Connect from GitHub Pages
# Host: docker-host-ip
# Port: 8000
```

## 🔍 Features

### Optimized Production Build
- **Vendor chunking**: Chart.js separated for better caching
- **Minification**: Compressed JavaScript and CSS
- **Source maps**: Debugging support in production
- **Asset optimization**: Optimized images and fonts

### CI/CD Pipeline Features
- **Fast builds**: npm caching for faster installations
- **Error detection**: Build failures prevent deployment
- **PR validation**: Ensures code quality before merging
- **Manual triggers**: Deploy on-demand via GitHub Actions UI

## 🐛 Troubleshooting

### Build Failures
- Check **Actions** tab for detailed logs
- Ensure `package-lock.json` is committed
- Verify Node.js compatibility (requires 18+)

### Asset Loading Issues
- Verify base URL in `vite.config.js` matches repository name
- Check that GitHub Pages is enabled and configured correctly
- Ensure `gh-pages` branch exists and has content

### Connection Issues
- Verify backend is accessible from internet
- Check CORS settings in backend allow GitHub Pages domain
- Test backend URL directly in browser

## 🔄 Manual Deployment

### Local Build and Deploy
```bash
# Build locally
cd frontend
npm run build

# Deploy manually (alternative to GitHub Actions)
# Upload dist/ contents to any static hosting service
```

### GitHub Actions Manual Trigger
1. Go to repository **Actions** tab
2. Select "Deploy Frontend to GitHub Pages"
3. Click **Run workflow**
4. Select branch (main) and click **Run workflow**

## 📈 Benefits

### For Users
- **No installation**: Access monitoring client from any browser
- **Universal compatibility**: Connect to any backend from anywhere
- **Always updated**: Latest version automatically deployed
- **Fast loading**: Optimized production build with CDN

### For Developers
- **Automated deployment**: No manual upload steps
- **Quality assurance**: PR testing prevents broken deployments
- **Easy maintenance**: Update frontend by pushing to main branch
- **Professional presentation**: Live demo for showcasing

## 🔗 Links

- **Live Demo**: `https://yourusername.github.io/proc-grapher/`
- **Actions**: `https://github.com/yourusername/proc-grapher/actions`
- **Deployment Workflow**: `.github/workflows/deploy-pages.yml`
- **Test Workflow**: `.github/workflows/test-build.yml`

---

**🎉 Your Proc Grapher frontend is now deployable to GitHub Pages with full CI/CD automation!** 
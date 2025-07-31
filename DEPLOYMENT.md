# 🚀 Deployment Guide - 911 Training Simulator

## ✅ Your Project is Ready to Deploy!

I've prepared everything needed for deployment. Here are your options:

## 🟢 Option 1: Deploy to Vercel (Recommended)

### Step 1: Push to GitHub (if not already done)
```bash
git add .
git commit -m "Ready for deployment with Deepgram integration"
git push origin main
```

### Step 2: Deploy via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will automatically detect it's a React app
5. Click "Deploy"

### Step 3: Add Environment Variables
In your Vercel project dashboard:
1. Go to "Settings" → "Environment Variables"
2. Add these variables:
   - `REACT_APP_OPENAI_API_KEY` = `your_openai_key`
   - `REACT_APP_DEEPGRAM_API_KEY` = `your_deepgram_key`
   - `REACT_APP_LIVEKIT_WS_URL` = `your_livekit_url` (optional)
   - `REACT_APP_LIVEKIT_TOKEN` = `your_livekit_token` (optional)

### Step 4: Redeploy
After adding environment variables, trigger a new deployment.

---

## 🟡 Option 2: Deploy via Vercel CLI

### Step 1: Install and Login to Vercel
```bash
npm install -g vercel
vercel login
```

### Step 2: Deploy
```bash
# From your project directory
vercel --prod
```

### Step 3: Set Environment Variables
```bash
vercel env add REACT_APP_OPENAI_API_KEY
vercel env add REACT_APP_DEEPGRAM_API_KEY
```

---

## 🟠 Option 3: Deploy to Netlify

### Via Netlify Dashboard:
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your `build` folder
3. Add environment variables in Site Settings

### Via Netlify CLI:
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=build
```

---

## 🔵 Option 4: Deploy to GitHub Pages

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Add to package.json:
```json
{
  "homepage": "https://yourusername.github.io/911-training-simulator",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```

3. Deploy:
```bash
npm run deploy
```

---

## 📋 Pre-Deployment Checklist

✅ Project builds successfully (`npm run build`)  
✅ All dependencies installed  
✅ Environment variables configured  
✅ Vercel.json configuration ready  
✅ README.md documentation complete  
✅ .env.example template provided  

## 🔑 Required API Keys

### OpenAI (Required)
- Get from: https://platform.openai.com/api-keys
- Used for: AI caller responses and text-to-speech

### Deepgram (Required) 
- Get from: https://console.deepgram.com/
- Used for: High-quality speech transcription

### LiveKit (Optional)
- Get from: https://cloud.livekit.io/
- Used for: Enhanced audio quality

## 🎯 Post-Deployment Testing

After deployment, test these features:
1. ✅ Load a transcript
2. ✅ Start a simulation
3. ✅ Speak into microphone (check transcription)
4. ✅ Listen to AI caller response
5. ✅ Test background sounds
6. ✅ Check debug menu for status

## 🐛 Common Deployment Issues

### Build Errors:
- Run `npm run build` locally first
- Fix any TypeScript/ESLint errors
- Check all imports are correct

### API Keys Not Working:
- Ensure environment variables start with `REACT_APP_`
- Check variables are set in deployment platform
- Redeploy after adding environment variables

### Audio Issues:
- HTTPS is required for microphone access
- Modern browsers block audio without user interaction
- Check browser permissions

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Use the debug menu (🛠️ button) to check status
3. Verify all API keys are correctly set
4. Test locally first with `npm start`

---

## 🎉 You're All Set!

Your 911 Training Simulator is ready for deployment! Choose the option that works best for you and follow the steps above. The app will be fully functional once deployed with the proper API keys configured.

**Recommended**: Use Vercel for the easiest deployment experience with automatic HTTPS and global CDN.
# 911 Training Simulator

A realistic 911 emergency call training simulator built with React, TypeScript, and AI services for emergency dispatcher training.

## 🚀 Features

- **AI-Powered Caller**: Context-aware emergency caller using OpenAI GPT-4
- **High-Quality Transcription**: Deepgram integration for accurate speech-to-text
- **Real-Time Interruption**: Bidirectional conversation with natural interruptions
- **Background Audio**: Realistic emergency sounds (traffic, crowd, home, outdoor)
- **CAD Interface**: Motorola Premier One style CAD system
- **Audio Device Selection**: Choose microphone and speaker devices
- **Call Management**: Timer, pause/resume, and hangup functionality
- **Debug Tools**: Comprehensive debugging and monitoring tools

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, CSS3
- **AI Services**: OpenAI (GPT-4, TTS, Whisper), Deepgram
- **Audio**: Web Audio API, LiveKit (optional)
- **Build**: Create React App, ESLint, TypeScript

## 📋 Prerequisites

You'll need API keys from:
- [OpenAI](https://platform.openai.com/api-keys) - For AI caller and text-to-speech
- [Deepgram](https://console.deepgram.com/) - For high-quality transcription
- [LiveKit](https://cloud.livekit.io/) - Optional, for enhanced audio quality

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/911-training-simulator)

### Manual Deployment Steps:

1. **Clone & Setup**:
   ```bash
   git clone <your-repo-url>
   cd 911-training-simulator
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env` and add your API keys:
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys
   ```

3. **Deploy to Vercel**:
   ```bash
   npm install -g vercel
   vercel
   ```

4. **Set Environment Variables** in Vercel Dashboard:
   - Go to your project settings
   - Add each environment variable from your `.env` file

## 🔧 Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start Development Server**:
   ```bash
   npm start
   ```

4. **Open**: http://localhost:3000

## 💻 Local Development

**Note**: Full functionality requires API keys and server deployment. For local development:

1. **Clone and Install**:
   ```bash
   git clone <your-repo-url>
   cd 911-training-simulator
   npm install
   ```

2. **Development Mode**:
   ```bash
   npm start
   ```

3. **Limitations in Development**:
   - ⚠️ **AI Caller**: Not available (requires deployed API endpoints)
   - ⚠️ **Deepgram**: Not available (falls back to browser speech recognition)
   - ⚠️ **LiveKit**: Not available (basic web audio only)
   - ✅ **Basic Features**: Transcription, CAD interface, settings work

4. **For Full Features**: Deploy to Vercel with environment variables set

## 📖 Usage

1. **Load Transcript**: Paste a 911 call transcript or select from examples
2. **Configure Settings**: Adjust cooperation level, background noise, location
3. **Start Training**: Click "Start Exercise" and begin the simulation
4. **Practice**: Speak as the dispatcher, AI caller will respond contextually
5. **Use CAD**: Fill out incident details in the CAD interface
6. **Debug**: Use the debug menu (🛠️) to monitor system status

## 🎛️ Configuration

### Caller Cooperation Levels:
- **Low (0-30)**: Panicked, crying, hard to understand
- **Medium (30-70)**: Stressed but trying to help
- **High (70-100)**: Calm, answers questions directly

### Background Sounds:
- **Traffic**: Engine noise, horns, tire sounds
- **Crowd**: Multiple voices, general commotion
- **Home**: HVAC, footsteps, TV background
- **Outdoor**: Wind, birds, distant traffic

## 🐛 Troubleshooting

### Common Issues:

1. **No Transcription**:
   - Check Deepgram API key is set
   - Verify microphone permissions
   - Check browser console for errors

2. **No AI Voice**:
   - Verify OpenAI API key
   - Check audio permissions
   - Try different audio output device

3. **Background Sounds Not Playing**:
   - Check volume levels
   - Verify audio context is resumed (click in browser first)

### Debug Tools:
- Open Debug Menu (🛠️ button) for system status
- Check browser console for detailed logs
- Monitor network tab for API requests

## 🔒 Security

- API keys are handled client-side (suitable for demo/training environments)
- For production use, implement server-side API key management
- All audio processing happens locally in the browser

## 📝 License

This project is for educational and training purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## ⚡ Performance Tips

- Use Chrome for best speech recognition support
- Ensure stable internet connection for AI services
- Close other audio applications to avoid conflicts
- Use headphones to prevent audio feedback

---

Built with ❤️ for emergency services training
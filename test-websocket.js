// Test WebSocket connection to LiveKit server
const WebSocket = require('ws');

// Test different URL formats
const urls = [
  'wss://prepared.livekit.cloud',
  'wss://prepared.livekit.cloud/ws',
  'wss://prepared.livekit.cloud/rtc',
  'wss://prepared.livekit.cloud/v1/ws'
];

async function testUrl(wsUrl) {
  return new Promise((resolve) => {
    console.log(`\n🌐 Testing: ${wsUrl}`);
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.on('open', () => {
        console.log('✅ Connection successful!');
        ws.close();
        resolve({ url: wsUrl, success: true });
      });
      
      ws.on('error', (error) => {
        console.log('❌ Connection failed:', error.message);
        resolve({ url: wsUrl, success: false, error: error.message });
      });
      
      ws.on('close', (code, reason) => {
        if (code !== 1000) {
          console.log('🔌 Closed with code:', code, 'reason:', reason.toString());
        }
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log('⏰ Timeout');
          ws.terminate();
          resolve({ url: wsUrl, success: false, error: 'Timeout' });
        }
      }, 5000);
      
    } catch (error) {
      console.log('❌ Failed to create WebSocket:', error.message);
      resolve({ url: wsUrl, success: false, error: error.message });
    }
  });
}

async function testAllUrls() {
  console.log('🔍 Testing different WebSocket URL formats...\n');
  
  for (const url of urls) {
    await testUrl(url);
  }
  
  console.log('\n🎯 Testing complete! If none worked, the LiveKit server might be down or require authentication.');
}

testAllUrls();
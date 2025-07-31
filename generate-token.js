// Simple script to generate LiveKit token
// Run with: node generate-token.js

const { AccessToken } = require('livekit-server-sdk');

const apiKey = 'APIsW857MNyZYXm';
const apiSecret = 'Nhbsgfbp5mBI89g9ZQ1hNRzg2T7ezcqn0PcRTuatQelA';

async function generateToken(roomName = '911-sim-room', participantName = 'dispatcher') {
  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    ttl: '24h' // Valid for 24 hours
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  return await at.toJwt();
}

// Generate token for any room (wildcard permissions)
generateToken('*', 'dispatcher').then(wildcardToken => {
  console.log('🎯 LiveKit Token Generated!');
  console.log('');
  console.log('Add this to your .env file:');
  console.log('REACT_APP_LIVEKIT_TOKEN=' + wildcardToken);
  console.log('');
  console.log('This token allows access to any room and is valid for 24 hours.');
  console.log('For production, generate tokens server-side with shorter expiry times.');
}).catch(error => {
  console.error('Error generating token:', error);
});
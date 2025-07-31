// Test script to verify token validity
const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiJ9.eyJ2aWRlbyI6eyJyb29tSm9pbiI6dHJ1ZSwicm9vbSI6IioiLCJjYW5QdWJsaXNoIjp0cnVlLCJjYW5TdWJzY3JpYmUiOnRydWUsImNhblB1Ymxpc2hEYXRhIjp0cnVlfSwiaXNzIjoiQVBJc1c4NTdNTnlaWVhtIiwiZXhwIjoxNzU0MDU3OTM3LCJuYmYiOjAsInN1YiI6ImRpc3BhdGNoZXIifQ.Yq6WDW0pAcInGZmyUcIS7jMG-Nf7e8Km6KUZUn_Wwcs';

try {
  // Decode without verification first
  const decoded = jwt.decode(token, { complete: true });
  console.log('🔍 Token Structure:');
  console.log('  Header:', decoded.header);
  console.log('  Payload:', decoded.payload);
  
  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  const exp = decoded.payload.exp;
  const timeLeft = exp - now;
  
  console.log('\n⏰ Token Timing:');
  console.log('  Current time:', new Date(now * 1000).toISOString());
  console.log('  Expires at:', new Date(exp * 1000).toISOString());
  console.log('  Time left:', Math.floor(timeLeft / 3600), 'hours', Math.floor((timeLeft % 3600) / 60), 'minutes');
  console.log('  Valid?', timeLeft > 0 ? '✅ Yes' : '❌ Expired');
  
  // Check permissions
  console.log('\n🔑 Permissions:');
  console.log('  Room Join:', decoded.payload.video.roomJoin ? '✅' : '❌');
  console.log('  Can Publish:', decoded.payload.video.canPublish ? '✅' : '❌');
  console.log('  Can Subscribe:', decoded.payload.video.canSubscribe ? '✅' : '❌');
  console.log('  Room Access:', decoded.payload.video.room);
  console.log('  Identity:', decoded.payload.sub);
  console.log('  Issuer:', decoded.payload.iss);
  
} catch (error) {
  console.error('❌ Error decoding token:', error.message);
}
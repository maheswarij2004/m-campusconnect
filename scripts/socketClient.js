// scripts/socketClient.js
const { io } = require('socket.io-client');
// Usage: node scripts/socketClient.js <jwtToken> <conversationId> <messageText>

const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Usage: node socketClient.js <jwtToken> <conversationId> <messageText>');
  process.exit(1);
}
const [token, convId, ...msgParts] = args;
const msgText = msgParts.join(' ');

const socket = io('http://localhost:5000', {
  auth: { token: `Bearer ${token}` },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('connected as socket id', socket.id);
  socket.emit('join_conversation', convId);
  setTimeout(() => {
    console.log('sending message:', msgText);
    socket.emit('send_message', { conversationId: convId, text: msgText });
  }, 500);
});

socket.on('new_message', (msg) => {
  console.log('new_message received:', msg);
});

socket.on('error', (err) => {
  console.error('socket error', err);
});

socket.on('disconnect', (reason) => {
  console.log('disconnected', reason);
});
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

// Disable auto-cancellation so parallel requests work fine
pb.autoCancellation(false);

export default pb;

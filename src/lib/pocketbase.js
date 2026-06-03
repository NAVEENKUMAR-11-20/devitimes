import PocketBase from 'pocketbase';

const pb = new PocketBase("https://pocketbase-production-ec1e.up.railway.app");

// Disable auto-cancellation so parallel requests work fine
pb.autoCancellation(false);

export default pb;

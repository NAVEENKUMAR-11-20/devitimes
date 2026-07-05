import PocketBase from 'pocketbase';

const pbUrl = import.meta.env.VITE_POCKETBASE_URL || 'https://api.devitimes.in';
const pb = new PocketBase(pbUrl);

// Disable auto-cancellation so parallel requests work fine
pb.autoCancellation(false);

export default pb;

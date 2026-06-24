import PocketBase from 'pocketbase';

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);

// Disable auto-cancellation so parallel requests work fine
pb.autoCancellation(false);

export default pb;

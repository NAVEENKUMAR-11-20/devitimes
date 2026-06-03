import PocketBase from 'pocketbase';

const pocketBaseUrl = import.meta.env.VITE_POCKETBASE_URL || "http://127.0.0.1:8090";
const pb = new PocketBase(pocketBaseUrl);

// Disable auto-cancellation so parallel requests work fine
pb.autoCancellation(false);

export default pb;

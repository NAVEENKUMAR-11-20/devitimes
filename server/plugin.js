import expressApp from './app.js';

export default function apiServerPlugin() {
  return {
    name: 'api-server-plugin',
    configureServer(server) {
      server.middlewares.use(expressApp);
    }
  };
}

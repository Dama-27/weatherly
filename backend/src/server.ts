import app from './app';
import { env } from './config/env';

/**
 * Local development HTTP server entry point.
 *
 * Starts a traditional long-running Node.js HTTP listener on the configured port.
 * Used for local development (`npm run dev`) and standard containerized deployments.
 */
const server = app.listen(env.port, () => {
  console.log(`Weatherly backend server running on http://localhost:${env.port} [env=${env.nodeEnv}]`);
});

export default server;

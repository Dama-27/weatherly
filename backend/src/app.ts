import express from 'express';
import weatherRouter from './routes/weather.routes';
import locationRouter from './routes/location.routes';
import cacheRouter from './routes/cache.router';

const app = express();

app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
  });
});

app.use('/api', weatherRouter);
app.use('/api', locationRouter);
app.use('/api', cacheRouter);

export default app;

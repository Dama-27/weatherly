import { Router } from 'express';
import {
  createAlert,
  deleteAlert,
  getUserAlerts,
  updateAlert,
} from '../controllers/alert.controller';
import { validateAccessToken } from '../middleware/auth0.middleware';

const alertRouter = Router();

// All /alerts routes require a valid JWT access token
alertRouter.get('/alerts', validateAccessToken, getUserAlerts);
alertRouter.post('/alerts', validateAccessToken, createAlert);
alertRouter.put('/alerts/:id', validateAccessToken, updateAlert);
alertRouter.delete('/alerts/:id', validateAccessToken, deleteAlert);

export default alertRouter;

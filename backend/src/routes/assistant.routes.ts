import { Router } from 'express';
import { askAssistant } from '../controllers/assistant.controller';

const assistantRouter = Router();

assistantRouter.post('/assistant/ask', askAssistant);

export default assistantRouter;


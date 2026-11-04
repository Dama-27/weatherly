import { Router } from 'express';
import { searchLocations } from '../controllers/location.controller';

const locationRouter = Router();

locationRouter.get('/locations/search', searchLocations);

export default locationRouter;


import { Request, Response } from 'express';
import { parseSearchQuery, ValidationError } from '../common/validation';
import { searchLocations as queryLocations } from '../services/location.service';

export async function searchLocations(request: Request, response: Response): Promise<void> {
  try {
    const { query, limit } = parseSearchQuery(request.query.q, request.query.limit);

    const results = await queryLocations(query, limit);

    response.json({
      results,
      count: results.length,
    });
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      response.status(400).json({ error: err.message });
      return;
    }

    if (err instanceof Error) {
      if ((err as any).isTimeout) {
        response.status(504).json({ error: 'Location search request timed out' });
        return;
      }
      console.error('Failed to search locations:', err.message);
      response.status(502).json({ error: 'Failed to search locations from geocoding service' });
      return;
    }

    console.error('Unexpected error searching locations:', err);
    response.status(500).json({ error: 'Internal server error while searching locations' });
  }
}


import { Router } from 'express';
import { dashboardQueries } from '../db/queries.js';

const router = Router();

router.get('/summary', (_req, res) => {
  res.json(dashboardQueries.summary());
});

export default router;

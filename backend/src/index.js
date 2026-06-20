import express from 'express';
import cors from 'cors';
import { initDb } from './db/schema.js';
import activitiesRouter from './routes/activities.js';
import healthRouter from './routes/health.js';
import dashboardRouter from './routes/dashboard.js';
import notesRouter from './routes/notes.js';
import painLogRouter from './routes/painLog.js';
import syncRouter from './routes/sync.js';
import configRouter from './routes/config.js';
import aiRouter from './routes/ai.js';

const app = express();
const PORT = process.env.BACKEND_PORT;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initDb();

app.use('/api/activities', activitiesRouter);
app.use('/api/health', healthRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/notes', notesRouter);
app.use('/api/pain-log', painLogRouter);
app.use('/api/sync', syncRouter);
app.use('/api/config', configRouter);
app.use('/api/ai', aiRouter);

app.get('/api/health-check', (_req, res) => res.json({ status: 'ok' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`HealthApp backend running on port ${PORT}`);
});

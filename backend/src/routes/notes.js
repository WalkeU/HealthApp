import { Router } from 'express';
import { noteQueries } from '../db/queries.js';

const router = Router();

router.get('/', (req, res) => {
  const { from, to, limit } = req.query;
  res.json(noteQueries.list({ from, to, limit }));
});

router.get('/:id', (req, res) => {
  const note = noteQueries.getById(req.params.id);
  if (!note) return res.status(404).json({ error: 'Not found' });
  res.json(note);
});

router.post('/', (req, res) => {
  const { date, activity_id, content, tags, wellbeing_score } = req.body;
  if (!date || !content) return res.status(400).json({ error: 'date and content are required' });
  const note = noteQueries.create({
    date,
    activity_id: activity_id ?? null,
    content,
    tags: tags ? (Array.isArray(tags) ? tags.join(',') : tags) : null,
    wellbeing_score: wellbeing_score ?? null,
  });
  res.status(201).json(note);
});

router.put('/:id', (req, res) => {
  const { content, tags, wellbeing_score, date } = req.body;
  const fields = {};
  if (content !== undefined) fields.content = content;
  if (date !== undefined) fields.date = date;
  if (wellbeing_score !== undefined) fields.wellbeing_score = wellbeing_score;
  if (tags !== undefined) fields.tags = Array.isArray(tags) ? tags.join(',') : tags;
  const updated = noteQueries.update(req.params.id, fields);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const result = noteQueries.delete(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

export default router;

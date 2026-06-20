import { Router } from "express"
import { painLogQueries } from "../db/queries.js"

const router = Router()

router.get("/", (req, res) => {
  const { from, to, limit } = req.query
  res.json(painLogQueries.list({ from, to, limit }))
})

router.post("/", (req, res) => {
  const { date, body_part, severity, description } = req.body
  if (!date || !body_part || !severity) {
    return res.status(400).json({ error: "date, body_part, and severity are required" })
  }
  if (severity < 1 || severity > 5) {
    return res.status(400).json({ error: "severity must be between 1 and 5" })
  }
  const entry = painLogQueries.create({
    date,
    body_part,
    severity: parseInt(severity, 10),
    description: description ?? null,
  })
  res.status(201).json(entry)
})

export default router

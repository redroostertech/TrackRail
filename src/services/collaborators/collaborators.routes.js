const { Router } = require('express');
const { z } = require('zod');
const service = require('./collaborators.service');
const { validateRequest } = require('../../shared/middleware/validation.middleware');

const router = Router();

router.get('/', (req, res) => {
  const collaborators = service.findAll(req.query.search);
  res.json({ data: collaborators });
});

router.post('/', validateRequest({
  body: z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().optional().or(z.literal('')),
    role: z.enum(['songwriter', 'producer', 'featured_artist', 'mixer', 'engineer']).optional(),
    pro_affiliation: z.enum(['ascap', 'bmi', 'sesac', 'none']).optional(),
    pro_member_id: z.string().max(50).optional(),
    ipi_number: z.string().max(50).optional(),
    publisher: z.string().max(200).optional()
  })
}), (req, res) => {
  const collab = service.create(req.body);
  res.status(201).json({ data: collab });
});

router.get('/:id', (req, res) => {
  const collab = service.findById(req.params.id);
  res.json({ data: collab });
});

router.put('/:id', validateRequest({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().optional().or(z.literal('')),
    role: z.enum(['songwriter', 'producer', 'featured_artist', 'mixer', 'engineer']).optional(),
    pro_affiliation: z.enum(['ascap', 'bmi', 'sesac', 'none']).optional(),
    pro_member_id: z.string().max(50).optional(),
    ipi_number: z.string().max(50).optional(),
    publisher: z.string().max(200).optional()
  })
}), (req, res) => {
  const collab = service.update(req.params.id, req.body);
  res.json({ data: collab });
});

router.delete('/:id', (req, res) => {
  service.remove(req.params.id);
  res.json({ message: 'Collaborator deleted' });
});

module.exports = router;

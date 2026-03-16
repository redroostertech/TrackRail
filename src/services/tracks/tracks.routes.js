const { Router } = require('express');
const { z } = require('zod');
const path = require('path');
const multer = require('multer');
const service = require('./tracks.service');
const { validateRequest } = require('../../shared/middleware/validation.middleware');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.wav', '.mp3', '.flac', '.aiff', '.m4a', '.ogg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format. Allowed: wav, mp3, flac, aiff, m4a, ogg'));
    }
  }
});

const router = Router();

// Tracks for a release
router.get('/releases/:releaseId/tracks', (req, res) => {
  const tracks = service.findByRelease(req.params.releaseId);
  res.json({ data: tracks });
});

// Upload track
router.post('/releases/:releaseId/tracks', upload.single('audio'), (req, res) => {
  const title = req.body.title || (req.file ? path.parse(req.file.originalname).name : 'Untitled');
  const track = service.create({
    release_id: req.params.releaseId,
    title,
    file_path: req.file ? req.file.path : null,
    file_name: req.file ? req.file.originalname : null,
    file_size: req.file ? req.file.size : null,
    file_format: req.file ? path.extname(req.file.originalname).slice(1).toLowerCase() : null
  });
  res.status(201).json({ data: track });
});

// Single track
router.get('/tracks/:id', (req, res) => {
  const track = service.findById(req.params.id);
  res.json({ data: track });
});

router.put('/tracks/:id', validateRequest({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    track_number: z.number().int().positive().optional(),
    bpm: z.number().optional(),
    musical_key: z.string().max(50).optional(),
    genre: z.string().max(100).optional(),
    mood: z.string().max(100).optional(),
    energy: z.number().min(0).max(1).optional(),
    isrc_code: z.string().max(20).optional(),
    lyrics: z.string().max(10000).optional(),
    explicit: z.number().int().min(0).max(1).optional()
  })
}), (req, res) => {
  const track = service.update(req.params.id, req.body);
  res.json({ data: track });
});

router.delete('/tracks/:id', (req, res) => {
  service.remove(req.params.id);
  res.json({ message: 'Track deleted' });
});

// AI analyze
router.post('/tracks/:id/analyze', async (req, res, next) => {
  try {
    const track = await service.analyze(req.params.id);
    res.json({ data: track });
  } catch (err) { next(err); }
});

// Generate ISRC
router.post('/tracks/:id/isrc', (req, res) => {
  const track = service.assignISRC(req.params.id);
  res.json({ data: track });
});

module.exports = router;

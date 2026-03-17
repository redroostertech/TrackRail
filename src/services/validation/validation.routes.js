const { Router } = require('express');
const { z } = require('zod');
const controller = require('./validation.controller');
const { validateRequest } = require('../../shared/middleware/validation.middleware');

// Router for /api/v1/validation/*
const validationRouter = Router();

// List all rules
validationRouter.get('/rules', controller.listRules);

// Get single rule
validationRouter.get('/rules/:id', controller.getRule);

// Update a rule
validationRouter.put('/rules/:id', validateRequest({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(1000).optional(),
    severity: z.enum(['error', 'warning', 'info']).optional(),
    enabled: z.number().int().min(0).max(1).optional(),
    rule_config: z.union([z.string(), z.record(z.unknown())]).optional(),
    suggested_fix: z.string().max(500).optional()
  })
}), controller.updateRule);

// Acknowledge a result
validationRouter.put('/results/:id/acknowledge', controller.acknowledgeResult);

// Router for /api/v1/releases/:releaseId/validate|validation
const releaseValidationRouter = Router();

// Run validation on a release
releaseValidationRouter.post('/:releaseId/validate', controller.runValidation);

// Get latest validation results
releaseValidationRouter.get('/:releaseId/validation', controller.getLatestResults);

// Get validation run history
releaseValidationRouter.get('/:releaseId/validation/history', controller.getRunHistory);

module.exports = { validationRouter, releaseValidationRouter };

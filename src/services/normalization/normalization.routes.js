const { Router } = require('express');
const controller = require('./normalization.controller');

// Router for /api/v1/normalization/*
const normalizationRouter = Router();

normalizationRouter.get('/genres', controller.listGenres);
normalizationRouter.get('/genres/:id', controller.getGenre);
normalizationRouter.get('/moods', controller.listMoods);
normalizationRouter.get('/keys', controller.listKeys);
normalizationRouter.put('/suggestions/:id/accept', controller.acceptSuggestion);
normalizationRouter.put('/suggestions/:id/reject', controller.rejectSuggestion);

// Router for /api/v1/releases/:releaseId/normalize|normalization
const releaseNormalizationRouter = Router();

releaseNormalizationRouter.post('/:releaseId/normalize', controller.runNormalization);
releaseNormalizationRouter.get('/:releaseId/normalization', controller.getLatestSuggestions);
releaseNormalizationRouter.post('/:releaseId/normalization/accept-all', controller.acceptAll);

module.exports = { normalizationRouter, releaseNormalizationRouter };

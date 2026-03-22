const service = require('./normalization.service');

module.exports = {
  listGenres(req, res, next) {
    try {
      const genres = service.getGenres(req.query);
      res.json({ data: genres });
    } catch (err) {
      next(err);
    }
  },

  getGenre(req, res, next) {
    try {
      const genre = service.getGenreById(req.params.id);
      res.json({ data: genre });
    } catch (err) {
      next(err);
    }
  },

  listMoods(req, res, next) {
    try {
      const moods = service.getMoods();
      res.json({ data: moods });
    } catch (err) {
      next(err);
    }
  },

  listKeys(req, res, next) {
    try {
      const keys = service.getKeys();
      res.json({ data: keys });
    } catch (err) {
      next(err);
    }
  },

  runNormalization(req, res, next) {
    try {
      const result = service.runNormalization(req.params.releaseId);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  getLatestSuggestions(req, res, next) {
    try {
      const result = service.getLatestSuggestions(req.params.releaseId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  acceptSuggestion(req, res, next) {
    try {
      const result = service.acceptSuggestion(req.params.id);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  rejectSuggestion(req, res, next) {
    try {
      const result = service.rejectSuggestion(req.params.id);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  acceptAll(req, res, next) {
    try {
      const result = service.acceptAll(req.params.releaseId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
};

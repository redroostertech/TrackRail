const service = require('./validation.service');

module.exports = {
  listRules(req, res, next) {
    try {
      const rules = service.getRules(req.query);
      res.json({ data: rules });
    } catch (err) {
      next(err);
    }
  },

  getRule(req, res, next) {
    try {
      const rule = service.getRuleById(req.params.id);
      res.json({ data: rule });
    } catch (err) {
      next(err);
    }
  },

  updateRule(req, res, next) {
    try {
      const rule = service.updateRule(req.params.id, req.body);
      res.json({ data: rule });
    } catch (err) {
      next(err);
    }
  },

  runValidation(req, res, next) {
    try {
      const result = service.runValidation(req.params.releaseId);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  getLatestResults(req, res, next) {
    try {
      const result = service.getLatestResults(req.params.releaseId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  getRunHistory(req, res, next) {
    try {
      const runs = service.getRunHistory(req.params.releaseId);
      res.json({ data: runs });
    } catch (err) {
      next(err);
    }
  },

  acknowledgeResult(req, res, next) {
    try {
      const result = service.acknowledgeResult(req.params.id);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
};

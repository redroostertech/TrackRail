const controller = require('../../../src/services/validation/validation.controller');

// Mock the service
jest.mock('../../../src/services/validation/validation.service', () => ({
  getRules: jest.fn(),
  getRuleById: jest.fn(),
  updateRule: jest.fn(),
  runValidation: jest.fn(),
  getLatestResults: jest.fn(),
  getRunHistory: jest.fn(),
  acknowledgeResult: jest.fn()
}));

const service = require('../../../src/services/validation/validation.service');
const { NotFoundError } = require('../../../src/shared/errors/app.error');

function mockReq(overrides = {}) {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides
  };
}

function mockRes() {
  const res = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
}

describe('Validation Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listRules', () => {
    test('passes query params to service and returns data', () => {
      const rules = [{ id: '1', name: 'Rule 1' }];
      service.getRules.mockReturnValue(rules);
      const req = mockReq({ query: { category: 'title', severity: 'error' } });
      const res = mockRes();
      const next = jest.fn();

      controller.listRules(req, res, next);

      expect(service.getRules).toHaveBeenCalledWith({ category: 'title', severity: 'error' });
      expect(res.json).toHaveBeenCalledWith({ data: rules });
      expect(next).not.toHaveBeenCalled();
    });

    test('forwards errors to next', () => {
      const err = new Error('DB error');
      service.getRules.mockImplementation(() => { throw err; });
      const req = mockReq();
      const res = mockRes();
      const next = jest.fn();

      controller.listRules(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('getRule', () => {
    test('passes id to service and returns rule', () => {
      const rule = { id: 'r1', name: 'Rule' };
      service.getRuleById.mockReturnValue(rule);
      const req = mockReq({ params: { id: 'r1' } });
      const res = mockRes();
      const next = jest.fn();

      controller.getRule(req, res, next);

      expect(service.getRuleById).toHaveBeenCalledWith('r1');
      expect(res.json).toHaveBeenCalledWith({ data: rule });
    });

    test('forwards NotFoundError', () => {
      service.getRuleById.mockImplementation(() => { throw new NotFoundError('Validation rule'); });
      const req = mockReq({ params: { id: 'nope' } });
      const res = mockRes();
      const next = jest.fn();

      controller.getRule(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
    });
  });

  describe('updateRule', () => {
    test('passes id and body to service', () => {
      const updated = { id: 'r1', severity: 'warning' };
      service.updateRule.mockReturnValue(updated);
      const req = mockReq({ params: { id: 'r1' }, body: { severity: 'warning' } });
      const res = mockRes();
      const next = jest.fn();

      controller.updateRule(req, res, next);

      expect(service.updateRule).toHaveBeenCalledWith('r1', { severity: 'warning' });
      expect(res.json).toHaveBeenCalledWith({ data: updated });
    });
  });

  describe('runValidation', () => {
    test('calls service with releaseId and responds with 201', () => {
      const result = { run: { id: 'run1' }, results: [], decision: { outcome: 'approved' } };
      service.runValidation.mockReturnValue(result);
      const req = mockReq({ params: { releaseId: 'rel1' } });
      const res = mockRes();
      const next = jest.fn();

      controller.runValidation(req, res, next);

      expect(service.runValidation).toHaveBeenCalledWith('rel1');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: result });
    });

    test('forwards NotFoundError for missing release', () => {
      service.runValidation.mockImplementation(() => { throw new NotFoundError('Release'); });
      const req = mockReq({ params: { releaseId: 'nope' } });
      const res = mockRes();
      const next = jest.fn();

      controller.runValidation(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
    });
  });

  describe('getLatestResults', () => {
    test('returns null when no validation runs exist', () => {
      service.getLatestResults.mockReturnValue(null);
      const req = mockReq({ params: { releaseId: 'rel1' } });
      const res = mockRes();
      const next = jest.fn();

      controller.getLatestResults(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ data: null });
    });

    test('returns results when runs exist', () => {
      const data = { run: { id: 'run1' }, results: [{ id: 'res1' }], decision: null };
      service.getLatestResults.mockReturnValue(data);
      const req = mockReq({ params: { releaseId: 'rel1' } });
      const res = mockRes();
      const next = jest.fn();

      controller.getLatestResults(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ data });
    });
  });

  describe('getRunHistory', () => {
    test('returns array of runs', () => {
      const runs = [{ id: 'run1' }, { id: 'run2' }];
      service.getRunHistory.mockReturnValue(runs);
      const req = mockReq({ params: { releaseId: 'rel1' } });
      const res = mockRes();
      const next = jest.fn();

      controller.getRunHistory(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ data: runs });
    });
  });

  describe('acknowledgeResult', () => {
    test('passes id to service and returns updated result', () => {
      const result = { id: 'res1', acknowledged: 1 };
      service.acknowledgeResult.mockReturnValue(result);
      const req = mockReq({ params: { id: 'res1' } });
      const res = mockRes();
      const next = jest.fn();

      controller.acknowledgeResult(req, res, next);

      expect(service.acknowledgeResult).toHaveBeenCalledWith('res1');
      expect(res.json).toHaveBeenCalledWith({ data: result });
    });

    test('forwards NotFoundError for missing result', () => {
      service.acknowledgeResult.mockImplementation(() => { throw new NotFoundError('Validation result'); });
      const req = mockReq({ params: { id: 'nope' } });
      const res = mockRes();
      const next = jest.fn();

      controller.acknowledgeResult(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

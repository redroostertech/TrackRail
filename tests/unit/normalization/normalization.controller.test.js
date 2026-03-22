const controller = require('../../../src/services/normalization/normalization.controller');

jest.mock('../../../src/services/normalization/normalization.service', () => ({
  getGenres: jest.fn(),
  getGenreById: jest.fn(),
  getMoods: jest.fn(),
  getKeys: jest.fn(),
  runNormalization: jest.fn(),
  getLatestSuggestions: jest.fn(),
  acceptSuggestion: jest.fn(),
  rejectSuggestion: jest.fn(),
  acceptAll: jest.fn()
}));

const service = require('../../../src/services/normalization/normalization.service');
const { NotFoundError } = require('../../../src/shared/errors/app.error');

function mockReq(overrides = {}) {
  return { params: {}, query: {}, body: {}, ...overrides };
}

function mockRes() {
  const res = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
}

describe('Normalization Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listGenres', () => {
    test('passes query to service and returns data', () => {
      service.getGenres.mockReturnValue([{ id: '1', name: 'Pop' }]);
      const req = mockReq({ query: { search: 'pop' } });
      const res = mockRes();
      controller.listGenres(req, res, jest.fn());
      expect(service.getGenres).toHaveBeenCalledWith({ search: 'pop' });
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: '1', name: 'Pop' }] });
    });

    test('forwards errors', () => {
      service.getGenres.mockImplementation(() => { throw new Error('fail'); });
      const next = jest.fn();
      controller.listGenres(mockReq(), mockRes(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('getGenre', () => {
    test('returns genre with children', () => {
      const genre = { id: '1', name: 'Pop', children: [] };
      service.getGenreById.mockReturnValue(genre);
      const res = mockRes();
      controller.getGenre(mockReq({ params: { id: '1' } }), res, jest.fn());
      expect(res.json).toHaveBeenCalledWith({ data: genre });
    });

    test('forwards NotFoundError', () => {
      service.getGenreById.mockImplementation(() => { throw new NotFoundError('Genre'); });
      const next = jest.fn();
      controller.getGenre(mockReq({ params: { id: 'nope' } }), mockRes(), next);
      expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
    });
  });

  describe('listMoods', () => {
    test('returns moods array', () => {
      service.getMoods.mockReturnValue(['Energetic', 'Chill']);
      const res = mockRes();
      controller.listMoods(mockReq(), res, jest.fn());
      expect(res.json).toHaveBeenCalledWith({ data: ['Energetic', 'Chill'] });
    });
  });

  describe('listKeys', () => {
    test('returns keys array', () => {
      service.getKeys.mockReturnValue(['C Major', 'C Minor']);
      const res = mockRes();
      controller.listKeys(mockReq(), res, jest.fn());
      expect(res.json).toHaveBeenCalledWith({ data: ['C Major', 'C Minor'] });
    });
  });

  describe('runNormalization', () => {
    test('responds with 201', () => {
      const result = { run: { id: 'r1' }, suggestions: [] };
      service.runNormalization.mockReturnValue(result);
      const res = mockRes();
      controller.runNormalization(mockReq({ params: { releaseId: 'rel1' } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: result });
    });

    test('forwards NotFoundError for missing release', () => {
      service.runNormalization.mockImplementation(() => { throw new NotFoundError('Release'); });
      const next = jest.fn();
      controller.runNormalization(mockReq({ params: { releaseId: 'nope' } }), mockRes(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('getLatestSuggestions', () => {
    test('returns null when no runs', () => {
      service.getLatestSuggestions.mockReturnValue(null);
      const res = mockRes();
      controller.getLatestSuggestions(mockReq({ params: { releaseId: 'r1' } }), res, jest.fn());
      expect(res.json).toHaveBeenCalledWith({ data: null });
    });
  });

  describe('acceptSuggestion', () => {
    test('returns accepted suggestion', () => {
      service.acceptSuggestion.mockReturnValue({ id: 's1', status: 'accepted' });
      const res = mockRes();
      controller.acceptSuggestion(mockReq({ params: { id: 's1' } }), res, jest.fn());
      expect(res.json).toHaveBeenCalledWith({ data: { id: 's1', status: 'accepted' } });
    });
  });

  describe('rejectSuggestion', () => {
    test('returns rejected suggestion', () => {
      service.rejectSuggestion.mockReturnValue({ id: 's1', status: 'rejected' });
      const res = mockRes();
      controller.rejectSuggestion(mockReq({ params: { id: 's1' } }), res, jest.fn());
      expect(res.json).toHaveBeenCalledWith({ data: { id: 's1', status: 'rejected' } });
    });
  });

  describe('acceptAll', () => {
    test('returns updated run with count', () => {
      service.acceptAll.mockReturnValue({ run: { id: 'r1' }, accepted: 5 });
      const res = mockRes();
      controller.acceptAll(mockReq({ params: { releaseId: 'rel1' } }), res, jest.fn());
      expect(res.json).toHaveBeenCalledWith({ data: { run: { id: 'r1' }, accepted: 5 } });
    });
  });
});

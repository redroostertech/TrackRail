const repository = require('./normalization.repository');
const engine = require('./normalization.engine');
const eventsService = require('../events/events.service');
const releasesService = require('../releases/releases.service');
const releasesRepository = require('../releases/releases.repository');
const tracksRepository = require('../tracks/tracks.repository');
const { NotFoundError, ConflictError } = require('../../shared/errors/app.error');

module.exports = {
  // ---- Genre Taxonomy ----

  getGenres(filters) {
    const genres = repository.findAllGenres(filters);
    return genres.map(parseAliases);
  },

  getGenreById(id) {
    const genre = repository.findGenreById(id);
    if (!genre) throw new NotFoundError('Genre');
    const children = repository.findGenreChildren(id);
    return { ...parseAliases(genre), children: children.map(parseAliases) };
  },

  getMoods() {
    return engine.CANONICAL_MOODS;
  },

  getKeys() {
    return engine.CANONICAL_KEYS;
  },

  // ---- Normalization Runs ----

  runNormalization(releaseId) {
    // 1. Fetch release
    const release = releasesService.findById(releaseId);

    // 2. Fetch tracks
    const tracks = tracksRepository.findByRelease(releaseId);

    // 3. Fetch taxonomy
    const taxonomy = repository.findAllGenresFlat();

    // 4. Run engine
    const { suggestions } = engine.normalize(release, tracks, taxonomy);

    // 5. Create run
    const run = repository.createRun({
      release_id: releaseId,
      status: 'completed',
      total_suggestions: suggestions.length,
      pending: suggestions.length
    });

    // 6. Attach run_id and release_id, batch insert
    if (suggestions.length > 0) {
      const withRunId = suggestions.map(function (s) {
        return {
          ...s,
          run_id: run.id,
          release_id: s.track_id ? undefined : releaseId,
          // For track-level suggestions, release_id still needed for FK
        };
      });

      // Ensure release_id is set on all suggestions
      for (const s of withRunId) {
        if (!s.release_id) s.release_id = releaseId;
      }

      repository.createSuggestions(withRunId);
    }

    // 7. Record event
    eventsService.record(eventsService.EVENT_TYPES.NORMALIZATION_RUN, 'release', releaseId, {
      run_id: run.id,
      total_suggestions: suggestions.length
    });

    // 8. Fetch full suggestions for response
    const fullSuggestions = repository.findSuggestionsByRun(run.id);

    return { run: repository.findRunById(run.id), suggestions: fullSuggestions };
  },

  getLatestSuggestions(releaseId) {
    const run = repository.findLatestRun(releaseId);
    if (!run) return null;
    const suggestions = repository.findSuggestionsByRun(run.id);
    return { run, suggestions };
  },

  getRunHistory(releaseId) {
    return repository.findRunsByRelease(releaseId);
  },

  acceptSuggestion(id) {
    const suggestion = repository.findSuggestionById(id);
    if (!suggestion) throw new NotFoundError('Normalization suggestion');
    if (suggestion.status !== 'pending') {
      throw new ConflictError('Suggestion has already been ' + suggestion.status);
    }

    // Apply the change to the actual entity
    applySuggestion(suggestion);

    // Update suggestion status
    const updated = repository.updateSuggestionStatus(id, 'accepted');

    // Update run counts
    repository.updateRunCounts(suggestion.run_id);

    // Record event
    eventsService.record(eventsService.EVENT_TYPES.NORMALIZATION_ACCEPTED, 'release', suggestion.release_id, {
      suggestion_id: id,
      field_path: suggestion.field_path,
      original_value: suggestion.original_value,
      normalized_value: suggestion.normalized_value
    });

    return updated;
  },

  rejectSuggestion(id) {
    const suggestion = repository.findSuggestionById(id);
    if (!suggestion) throw new NotFoundError('Normalization suggestion');
    if (suggestion.status !== 'pending') {
      throw new ConflictError('Suggestion has already been ' + suggestion.status);
    }

    const updated = repository.updateSuggestionStatus(id, 'rejected');
    repository.updateRunCounts(suggestion.run_id);
    return updated;
  },

  acceptAll(releaseId) {
    const run = repository.findLatestRun(releaseId);
    if (!run) throw new NotFoundError('No normalization run found');

    const pending = repository.findPendingSuggestions(run.id);
    if (pending.length === 0) {
      return { run: repository.findRunById(run.id), accepted: 0 };
    }

    for (const suggestion of pending) {
      applySuggestion(suggestion);
      repository.updateSuggestionStatus(suggestion.id, 'accepted');
    }

    const updatedRun = repository.updateRunCounts(run.id);

    eventsService.record(eventsService.EVENT_TYPES.NORMALIZATION_ACCEPTED, 'release', releaseId, {
      run_id: run.id,
      batch: true,
      count: pending.length
    });

    return { run: updatedRun, accepted: pending.length };
  }
};

// ---- Internal Helpers ----

function applySuggestion(suggestion) {
  const fieldPath = suggestion.field_path;
  const value = suggestion.normalized_value;

  // Parse field_path to determine entity type and field name
  // Release-level: "title", "genre", "subgenre"
  // Track-level: "tracks[0].title", "tracks[1].mood"
  const dotIndex = fieldPath.indexOf('.');
  let fieldName;
  let isTrack = false;

  if (fieldPath.startsWith('tracks[')) {
    isTrack = true;
    fieldName = dotIndex !== -1 ? fieldPath.slice(dotIndex + 1) : fieldPath;
  } else {
    fieldName = fieldPath;
  }

  if (isTrack && suggestion.track_id) {
    tracksRepository.update(suggestion.track_id, { [fieldName]: value });
  } else {
    releasesRepository.update(suggestion.release_id, { [fieldName]: value });
  }
}

function parseAliases(genre) {
  if (genre && genre.aliases && typeof genre.aliases === 'string') {
    try {
      return { ...genre, aliases: JSON.parse(genre.aliases) };
    } catch {
      return genre;
    }
  }
  return genre;
}

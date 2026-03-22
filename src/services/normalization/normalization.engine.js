/**
 * TrackRail Normalization Engine
 *
 * Pure function module — no HTTP, no database, no side effects.
 * Receives release data + taxonomy, returns normalization suggestions.
 */

// ---- Constants ----

const MINOR_WORDS = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'in', 'on', 'at', 'to', 'of', 'with', 'by'];

const CANONICAL_MOODS = [
  'Energetic', 'Melancholic', 'Uplifting', 'Dark', 'Chill',
  'Aggressive', 'Romantic', 'Dreamy', 'Ethereal', 'Intense',
  'Peaceful', 'Nostalgic', 'Playful', 'Dramatic', 'Mysterious'
];

const MOOD_SYNONYMS = {
  'happy': 'Uplifting', 'sad': 'Melancholic', 'angry': 'Aggressive',
  'relaxing': 'Chill', 'calm': 'Peaceful', 'mellow': 'Chill',
  'groovy': 'Playful', 'haunting': 'Mysterious', 'epic': 'Dramatic',
  'wistful': 'Nostalgic', 'warm': 'Romantic', 'powerful': 'Intense',
  'soothing': 'Peaceful', 'trippy': 'Dreamy', 'ambient': 'Ethereal',
  'gloomy': 'Dark', 'upbeat': 'Energetic', 'somber': 'Melancholic',
  'fierce': 'Aggressive', 'tender': 'Romantic', 'serene': 'Peaceful',
  'funky': 'Playful', 'eerie': 'Mysterious', 'cinematic': 'Dramatic',
  'melancholy': 'Melancholic', 'lively': 'Energetic', 'moody': 'Dark'
};

const VALID_ROOTS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

const CANONICAL_KEYS = [];
for (const root of VALID_ROOTS) {
  CANONICAL_KEYS.push(root + ' Major');
  CANONICAL_KEYS.push(root + ' Minor');
}

// ---- Main Export ----

/**
 * Normalize a release and its tracks against a genre taxonomy.
 * @param {Object} release
 * @param {Array} tracks
 * @param {Array} taxonomy - Array of genre objects with { id, name, parent_id, level, aliases }
 * @returns {{ suggestions: Array }}
 */
function normalize(release, tracks, taxonomy) {
  const suggestions = [];

  // Release-level normalization
  addTitleSuggestions(suggestions, release, null, 'title', null);
  addGenreSuggestion(suggestions, release, null, 'genre', taxonomy, null);
  addGenreSuggestion(suggestions, release, null, 'subgenre', taxonomy, null);

  // Track-level normalization
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    addTitleSuggestions(suggestions, track, track, 'title', i);
    addGenreSuggestion(suggestions, track, track, 'genre', taxonomy, i);
    addMoodSuggestion(suggestions, track, track, i);
    addMusicalKeySuggestion(suggestions, track, track, i);
    addBpmSuggestion(suggestions, track, track, i);
  }

  return { suggestions: deduplicateSuggestions(suggestions) };
}

// ---- Normalization Rules ----

function addTitleSuggestions(suggestions, entity, track, field, trackIndex) {
  const value = entity[field];
  if (!value || typeof value !== 'string') return;

  // Whitespace cleanup first
  const cleaned = cleanWhitespace(value);
  if (cleaned !== value) {
    suggestions.push(makeSuggestion(entity, track, field, trackIndex, value, cleaned, 'whitespace_cleanup', 1.0, 'Removed extra whitespace'));
  }

  // Title case (apply to cleaned version)
  const source = cleaned !== value ? cleaned : value;
  const titleCased = toTitleCase(source);
  if (titleCased !== source) {
    suggestions.push(makeSuggestion(entity, track, field, trackIndex, value, titleCased, 'title_case', 1.0, 'Converted to title case'));
  }
}

function addGenreSuggestion(suggestions, entity, track, field, taxonomy, trackIndex) {
  const value = entity[field];
  if (!value || typeof value !== 'string' || value.trim() === '') return;

  const trimmed = value.trim();
  const match = matchGenre(trimmed, taxonomy);

  if (match && match.name !== trimmed) {
    suggestions.push(makeSuggestion(entity, track, field, trackIndex, trimmed, match.name, 'genre_taxonomy', match.confidence, match.reasoning));
  }
}

function addMoodSuggestion(suggestions, entity, track, trackIndex) {
  const value = entity.mood;
  if (!value || typeof value !== 'string' || value.trim() === '') return;

  const trimmed = value.trim();
  const match = matchMood(trimmed);

  if (match && match.name !== trimmed) {
    suggestions.push(makeSuggestion(entity, track, 'mood', trackIndex, trimmed, match.name, 'mood_standardize', match.confidence, match.reasoning));
  }
}

function addMusicalKeySuggestion(suggestions, entity, track, trackIndex) {
  const value = entity.musical_key;
  if (!value || typeof value !== 'string' || value.trim() === '') return;

  const trimmed = value.trim();
  const normalized = normalizeMusicalKey(trimmed);

  if (normalized && normalized !== trimmed) {
    suggestions.push(makeSuggestion(entity, track, 'musical_key', trackIndex, trimmed, normalized, 'key_format', 1.0, 'Standardized musical key format'));
  }
}

function addBpmSuggestion(suggestions, entity, track, trackIndex) {
  const value = entity.bpm;
  if (value === null || value === undefined) return;

  const num = Number(value);
  if (isNaN(num)) return;

  const rounded = Math.round(num);
  if (rounded !== num) {
    suggestions.push(makeSuggestion(entity, track, 'bpm', trackIndex, String(value), String(rounded), 'bpm_round', 1.0, 'Rounded BPM to nearest integer'));
  }
}

// ---- Matching Functions ----

function matchGenre(value, taxonomy) {
  const lower = value.toLowerCase();

  // Step 1: Exact name match (case-insensitive)
  for (const genre of taxonomy) {
    if (genre.name.toLowerCase() === lower) {
      return { name: genre.name, confidence: 1.0, reasoning: 'Exact match (case corrected)' };
    }
  }

  // Step 2: Alias match
  for (const genre of taxonomy) {
    if (!genre.aliases) continue;
    let aliases;
    if (typeof genre.aliases === 'string') {
      try { aliases = JSON.parse(genre.aliases); } catch { continue; }
    } else {
      aliases = genre.aliases;
    }
    if (!Array.isArray(aliases)) continue;

    for (const alias of aliases) {
      if (alias.toLowerCase() === lower) {
        return { name: genre.name, confidence: 1.0, reasoning: 'Matched alias "' + alias + '" to "' + genre.name + '"' };
      }
    }
  }

  // Step 3: Fuzzy match via bigram similarity
  let bestMatch = null;
  let bestScore = 0;

  for (const genre of taxonomy) {
    const similarity = bigramSimilarity(lower, genre.name.toLowerCase());
    if (similarity >= 0.6 && similarity > bestScore) {
      bestScore = similarity;
      bestMatch = genre;
    }
  }

  if (bestMatch) {
    const confidence = 0.5 + bestScore * 0.5; // maps 0.6-1.0 similarity to 0.8-1.0 confidence
    return { name: bestMatch.name, confidence: Math.round(confidence * 100) / 100, reasoning: 'Fuzzy match (' + Math.round(bestScore * 100) + '% similar to "' + bestMatch.name + '")' };
  }

  return null;
}

function matchMood(value) {
  const lower = value.toLowerCase();

  // Step 1: Exact match against canonical moods
  for (const mood of CANONICAL_MOODS) {
    if (mood.toLowerCase() === lower) {
      if (mood === value) return null; // Already correct, no suggestion needed
      return { name: mood, confidence: 1.0, reasoning: 'Exact match (case corrected)' };
    }
  }

  // Step 2: Synonym match
  if (MOOD_SYNONYMS[lower]) {
    return { name: MOOD_SYNONYMS[lower], confidence: 0.9, reasoning: 'Synonym: "' + value + '" mapped to "' + MOOD_SYNONYMS[lower] + '"' };
  }

  // Step 3: Fuzzy match
  let bestMatch = null;
  let bestScore = 0;

  for (const mood of CANONICAL_MOODS) {
    const similarity = bigramSimilarity(lower, mood.toLowerCase());
    if (similarity >= 0.6 && similarity > bestScore) {
      bestScore = similarity;
      bestMatch = mood;
    }
  }

  if (bestMatch) {
    const confidence = 0.5 + bestScore * 0.5;
    return { name: bestMatch, confidence: Math.round(confidence * 100) / 100, reasoning: 'Fuzzy match (' + Math.round(bestScore * 100) + '% similar to "' + bestMatch + '")' };
  }

  return null;
}

// ---- String Normalization Functions ----

function cleanWhitespace(str) {
  if (!str) return str;
  return str.trim().split(' ').filter(function (s) { return s.length > 0; }).join(' ');
}

function toTitleCase(str) {
  if (!str) return str;
  const words = str.split(' ');
  const result = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word.length === 0) continue;

    if (i === 0 || i === words.length - 1) {
      // First and last word always capitalized
      result.push(capitalizeWord(word));
    } else if (MINOR_WORDS.indexOf(word.toLowerCase()) !== -1) {
      // Minor word in the middle: lowercase
      result.push(word.toLowerCase());
    } else {
      result.push(capitalizeWord(word));
    }
  }

  return result.join(' ');
}

function capitalizeWord(word) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function normalizeMusicalKey(value) {
  if (!value) return null;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  // Parse root note
  let root = trimmed.charAt(0).toUpperCase();
  let pos = 1;

  // Check for sharp or flat
  if (pos < trimmed.length) {
    const next = trimmed.charAt(pos);
    if (next === '#') {
      root += '#';
      pos++;
    } else if (next === 'b' || next === 'B') {
      // Distinguish: "Bb" (B-flat) vs "B major"
      // If followed by nothing, space, or 'm'/'M' — it's a flat
      // If root is 'B' and next char after 'b' is a space or end, check context
      if (root !== 'B' || pos + 1 >= trimmed.length || trimmed.charAt(pos + 1) === ' ' || trimmed.charAt(pos + 1).toLowerCase() === 'm') {
        // Only treat as flat if root could have a flat
        const flattable = ['D', 'E', 'G', 'A', 'B'];
        if (flattable.indexOf(root) !== -1) {
          root += 'b';
          pos++;
        }
      }
    }
  }

  // Validate root
  if (VALID_ROOTS.indexOf(root) === -1) return null;

  // Parse quality (major/minor)
  const rest = trimmed.slice(pos).trim().toLowerCase();
  let quality = 'Major'; // default

  if (rest.length > 0) {
    if (rest === 'minor' || rest === 'min' || rest === 'm') {
      quality = 'Minor';
    } else if (rest === 'major' || rest === 'maj') {
      quality = 'Major';
    }
    // If rest is something else unrecognized, default to Major
  }

  return root + ' ' + quality;
}

// ---- Bigram Similarity (no regex) ----

function getBigrams(str) {
  const s = str.toLowerCase();
  const bigrams = [];
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.push(s.charAt(i) + s.charAt(i + 1));
  }
  return bigrams;
}

function bigramSimilarity(a, b) {
  if (!a || !b) return 0;
  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);
  if (bigramsA.length === 0 || bigramsB.length === 0) return 0;

  let matches = 0;
  const used = new Array(bigramsB.length).fill(false);

  for (let i = 0; i < bigramsA.length; i++) {
    for (let j = 0; j < bigramsB.length; j++) {
      if (!used[j] && bigramsB[j] === bigramsA[i]) {
        matches++;
        used[j] = true;
        break;
      }
    }
  }

  return (2 * matches) / (bigramsA.length + bigramsB.length);
}

// ---- Helpers ----

function makeSuggestion(entity, track, field, trackIndex, originalValue, normalizedValue, ruleApplied, confidence, reasoning) {
  const fieldPath = track ? 'tracks[' + trackIndex + '].' + field : field;
  return {
    release_id: track ? undefined : entity.id,
    track_id: track ? track.id : null,
    field_path: fieldPath,
    original_value: originalValue,
    normalized_value: normalizedValue,
    rule_applied: ruleApplied,
    confidence: confidence,
    reasoning: reasoning
  };
}

function deduplicateSuggestions(suggestions) {
  // If whitespace_cleanup and title_case both target the same field,
  // keep only title_case (it incorporates whitespace cleanup)
  const byFieldPath = {};
  for (const s of suggestions) {
    const key = (s.track_id || 'release') + ':' + s.field_path;
    if (!byFieldPath[key]) {
      byFieldPath[key] = [];
    }
    byFieldPath[key].push(s);
  }

  const result = [];
  for (const key in byFieldPath) {
    const group = byFieldPath[key];
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      // Prefer title_case over whitespace_cleanup for same field
      const titleCase = group.find(function (s) { return s.rule_applied === 'title_case'; });
      if (titleCase) {
        result.push(titleCase);
      } else {
        // Keep last (most specific) suggestion
        result.push(group[group.length - 1]);
      }
    }
  }

  return result;
}

// ---- Exports ----

module.exports = {
  normalize,
  // Exported for testing and API use
  CANONICAL_MOODS,
  CANONICAL_KEYS,
  MINOR_WORDS,
  // Exported for unit testing individual functions
  toTitleCase,
  cleanWhitespace,
  normalizeMusicalKey,
  matchGenre,
  matchMood,
  bigramSimilarity
};

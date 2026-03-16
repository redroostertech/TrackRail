const OpenAI = require('openai');

let openai;

function getClient() {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

function isEnabled() {
  return !!process.env.OPENAI_API_KEY;
}

// Analyze track metadata using AI
async function analyzeTrack(title, fileName, lyrics) {
  if (!isEnabled()) return mockAnalysis(title, fileName);

  const client = getClient();
  const prompt = `You are a music metadata analyst. Analyze this track and return ONLY valid JSON.

Track title: "${title}"
File name: "${fileName}"
${lyrics ? `Lyrics excerpt: "${lyrics.substring(0, 500)}"` : ''}

Return JSON with these fields:
- bpm: number (estimated beats per minute, typical range 60-180)
- musical_key: string (e.g. "C major", "A minor", "F# minor")
- genre: string (primary genre)
- subgenre: string (subgenre if applicable)
- mood: string (one word: energetic, melancholic, uplifting, dark, chill, aggressive, romantic, dreamy)
- energy: number (0.0 to 1.0)
- tags: array of 5 descriptive tags for discovery

Return ONLY the JSON object, no markdown.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 300
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return mockAnalysis(title, fileName);
  }
}

// Generate copyright filing metadata
async function prepareCopyrightFiling(track, artist, collaborators) {
  if (!isEnabled()) return mockCopyrightFiling(track, artist);

  const client = getClient();
  const collabList = collaborators.map(c => `${c.name} (${c.role})`).join(', ');

  const prompt = `You are a music copyright specialist. Prepare copyright registration metadata for a sound recording.

Track: "${track.title}"
Artist/Claimant: "${artist.name}"
Collaborators: ${collabList || 'None'}
Genre: ${track.genre || 'Unknown'}
Year: ${new Date().getFullYear()}

Return ONLY valid JSON with:
- title: the work title (formatted properly)
- author_name: primary author(s)
- claimant_name: copyright claimant
- year_completed: year string
- year_published: year string (or empty if unpublished)
- work_type: "Sound Recording" or "Musical Work"
- authorship_statement: brief description of authorship (e.g. "Music and lyrics")
- rights_statement: standard rights claim text
- notes: any filing recommendations

Return ONLY the JSON object.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 400
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return mockCopyrightFiling(track, artist);
  }
}

// Generate split sheet suggestions
async function suggestSplits(track, collaborators) {
  if (!isEnabled()) return mockSplitSuggestion(collaborators);

  const client = getClient();
  const collabList = collaborators.map(c => `${c.name} (${c.role})`).join(', ');

  const prompt = `You are a music rights expert. Suggest fair royalty split percentages.

Track: "${track.title}"
Collaborators: ${collabList}

Industry standards:
- Songwriter who writes lyrics AND melody: larger share
- Producer: typically 15-25% of master
- Featured artist: typically 15-25%
- If only one songwriter, they get the full writing share

Return ONLY valid JSON array where each item has:
- name: collaborator name
- role: their role
- writer_share: percentage of songwriting (must sum to 100)
- master_share: percentage of master recording (must sum to 100)
- reasoning: brief explanation

Return ONLY the JSON array.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 500
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return mockSplitSuggestion(collaborators);
  }
}

// Generate release milestones
async function generateMilestones(releaseDate, releaseType) {
  if (!isEnabled()) return mockMilestones(releaseDate, releaseType);

  const client = getClient();
  const prompt = `You are a music release strategist. Create a release timeline.

Release date: ${releaseDate}
Release type: ${releaseType} (single/ep/album)

Create a timeline of milestones working backwards from the release date.
Industry best practices: submit to distributors 4+ weeks early, pitch playlists 4 weeks early, etc.

Return ONLY valid JSON array where each item has:
- title: milestone name
- description: what needs to happen
- due_date: ISO date string (YYYY-MM-DD)
- milestone_type: one of: upload, metadata, splits, copyright, pro, distribution, marketing, launch, custom
- sort_order: integer for ordering

Return ONLY the JSON array.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 800
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return mockMilestones(releaseDate, releaseType);
  }
}

// Generate ISRC code
function generateISRC() {
  const country = 'US';
  const registrant = 'TRL'; // TrackRail
  const year = new Date().getFullYear().toString().slice(-2);
  const serial = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `${country}-${registrant}-${year}-${serial}`;
}

// Suggest optimal release date (always a Friday)
function suggestReleaseDate() {
  const now = new Date();
  const weeksOut = 6;
  const target = new Date(now.getTime() + weeksOut * 7 * 24 * 60 * 60 * 1000);
  // Move to next Friday
  const day = target.getDay();
  const daysToFriday = (5 - day + 7) % 7 || 7;
  target.setDate(target.getDate() + daysToFriday);
  return target.toISOString().split('T')[0];
}

// ---- Mock fallbacks ----

function mockAnalysis(title, fileName) {
  const genres = ['Pop', 'Hip-Hop', 'R&B', 'Rock', 'Electronic', 'Country', 'Jazz', 'Latin'];
  const moods = ['energetic', 'melancholic', 'uplifting', 'chill', 'dark', 'romantic', 'dreamy', 'aggressive'];
  const keys = ['C major', 'G major', 'D minor', 'A minor', 'F major', 'Bb major', 'E minor', 'Ab major'];

  return {
    bpm: Math.floor(Math.random() * 80) + 80,
    musical_key: keys[Math.floor(Math.random() * keys.length)],
    genre: genres[Math.floor(Math.random() * genres.length)],
    subgenre: '',
    mood: moods[Math.floor(Math.random() * moods.length)],
    energy: Math.round(Math.random() * 10) / 10,
    tags: ['original', 'independent', 'new release', title.toLowerCase(), 'single']
  };
}

function mockCopyrightFiling(track, artist) {
  const year = new Date().getFullYear().toString();
  return {
    title: track.title,
    author_name: artist.name,
    claimant_name: artist.name,
    year_completed: year,
    year_published: '',
    work_type: 'Sound Recording',
    authorship_statement: 'Music and lyrics',
    rights_statement: `© ${year} ${artist.name}. All rights reserved.`,
    notes: 'Review all fields before filing. Ensure deposit copy (audio file) is ready.'
  };
}

function mockSplitSuggestion(collaborators) {
  if (!collaborators.length) return [];
  const share = Math.floor(100 / collaborators.length);
  const remainder = 100 - share * collaborators.length;
  return collaborators.map((c, i) => ({
    name: c.name,
    role: c.role,
    writer_share: share + (i === 0 ? remainder : 0),
    master_share: share + (i === 0 ? remainder : 0),
    reasoning: 'Equal split (adjust based on actual contribution)'
  }));
}

function mockMilestones(releaseDate, releaseType) {
  const release = new Date(releaseDate);
  const ms = (weeks) => {
    const d = new Date(release);
    d.setDate(d.getDate() - weeks * 7);
    return d.toISOString().split('T')[0];
  };

  return [
    { title: 'Finalize masters', description: 'Complete final mix and master', due_date: ms(8), milestone_type: 'upload', sort_order: 1 },
    { title: 'Complete metadata', description: 'Genre, mood, credits, ISRC codes', due_date: ms(7), milestone_type: 'metadata', sort_order: 2 },
    { title: 'Split sheets signed', description: 'All collaborators agree on splits', due_date: ms(6), milestone_type: 'splits', sort_order: 3 },
    { title: 'Copyright filing', description: 'Submit copyright registration', due_date: ms(6), milestone_type: 'copyright', sort_order: 4 },
    { title: 'PRO registration', description: 'Register work with ASCAP/BMI/SESAC', due_date: ms(5), milestone_type: 'pro', sort_order: 5 },
    { title: 'Submit to distributor', description: 'Upload to DistroKid/TuneCore', due_date: ms(4), milestone_type: 'distribution', sort_order: 6 },
    { title: 'Playlist pitching', description: 'Submit to playlist curators', due_date: ms(4), milestone_type: 'marketing', sort_order: 7 },
    { title: 'Pre-save campaign', description: 'Set up pre-save links', due_date: ms(3), milestone_type: 'marketing', sort_order: 8 },
    { title: 'Social media teasers', description: 'Post teasers and snippets', due_date: ms(2), milestone_type: 'marketing', sort_order: 9 },
    { title: 'Release day', description: 'Song goes live!', due_date: releaseDate, milestone_type: 'launch', sort_order: 10 }
  ];
}

module.exports = {
  analyzeTrack,
  prepareCopyrightFiling,
  suggestSplits,
  generateMilestones,
  generateISRC,
  suggestReleaseDate,
  isEnabled
};

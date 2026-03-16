const { getDb } = require('../../database');
const { v4: uuid } = require('uuid');

module.exports = {
  getOverview() {
    const db = getDb();
    const totalStreams = db.prepare('SELECT COALESCE(SUM(streams), 0) as total FROM stream_stats').get().total;
    const totalRevenue = db.prepare('SELECT COALESCE(SUM(revenue), 0) as total FROM stream_stats').get().total;
    const totalSaves = db.prepare('SELECT COALESCE(SUM(saves), 0) as total FROM stream_stats').get().total;

    const topTracks = db.prepare(`
      SELECT t.id, t.title, r.title as release_title, SUM(s.streams) as total_streams, SUM(s.revenue) as total_revenue
      FROM stream_stats s
      JOIN tracks t ON s.track_id = t.id
      JOIN releases r ON t.release_id = r.id
      GROUP BY s.track_id
      ORDER BY total_streams DESC
      LIMIT 5
    `).all();

    const platformBreakdown = db.prepare(`
      SELECT platform, SUM(streams) as total_streams, SUM(revenue) as total_revenue
      FROM stream_stats
      GROUP BY platform
      ORDER BY total_streams DESC
    `).all();

    return { totalStreams, totalRevenue, totalSaves, topTracks, platformBreakdown };
  },

  getTrackStats(trackId) {
    const db = getDb();
    const daily = db.prepare(`
      SELECT date, SUM(streams) as streams, SUM(revenue) as revenue, SUM(saves) as saves
      FROM stream_stats
      WHERE track_id = ?
      GROUP BY date
      ORDER BY date ASC
    `).all(trackId);

    const byPlatform = db.prepare(`
      SELECT platform, SUM(streams) as streams, SUM(revenue) as revenue
      FROM stream_stats
      WHERE track_id = ?
      GROUP BY platform
      ORDER BY streams DESC
    `).all(trackId);

    return { daily, byPlatform };
  },

  getPlatformStats() {
    return getDb().prepare(`
      SELECT platform, SUM(streams) as streams, SUM(revenue) as revenue, SUM(saves) as saves, SUM(playlist_adds) as playlist_adds
      FROM stream_stats
      GROUP BY platform
      ORDER BY streams DESC
    `).all();
  },

  seedData() {
    const db = getDb();
    const tracks = db.prepare('SELECT id FROM tracks').all();
    if (!tracks.length) return { seeded: 0 };

    const platforms = ['spotify', 'apple_music', 'amazon_music', 'youtube_music', 'tidal', 'deezer'];
    const insert = db.prepare(`INSERT OR REPLACE INTO stream_stats (id, track_id, platform, date, streams, revenue, saves, playlist_adds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

    let count = 0;
    const txn = db.transaction(() => {
      for (const track of tracks) {
        for (const platform of platforms) {
          // Generate 30 days of data
          for (let d = 29; d >= 0; d--) {
            const date = new Date();
            date.setDate(date.getDate() - d);
            const dateStr = date.toISOString().split('T')[0];

            const baseStreams = Math.floor(Math.random() * 500) + 10;
            const multiplier = platform === 'spotify' ? 3 : platform === 'apple_music' ? 2 : 1;

            insert.run(
              uuid(),
              track.id,
              platform,
              dateStr,
              baseStreams * multiplier,
              Math.round(baseStreams * multiplier * 0.004 * 100) / 100,
              Math.floor(Math.random() * 20),
              Math.floor(Math.random() * 5)
            );
            count++;
          }
        }
      }
    });

    txn();
    return { seeded: count };
  }
};

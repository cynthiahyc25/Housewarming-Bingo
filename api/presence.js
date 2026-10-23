// Shared party state: who's online, everyone's score, and the party feed.
// Backed by Upstash Redis (Vercel Marketplace) over its REST API, so no npm deps.

const PLAYERS_KEY = 'bingo:players';
const FEED_KEY = 'bingo:feed';
const ONLINE_WINDOW_MS = 25 * 1000;
const STALE_PLAYER_MS = 12 * 60 * 60 * 1000;
const FEED_LENGTH = 40;
const KEY_TTL_SECONDS = 2 * 24 * 60 * 60;
const INBOX_LENGTH = 20;
const MAX_SPOTS_PER_REQUEST = 5;
const FULL_BOARD_SCORE = 24;
const FULL_BOARD_LINES = [
  'filled the entire board #GGFrickinEazyyyyy #GOAT 😼',
  'filled the whole board. Somebody give them a crown 👑',
  'knows more about you than you do 🕵️',
  'is wayyyy too popular 🙄 how tf do you even fill out the whole board'
];

// Announced once each, the moment someone has been put on this many squares in total.
const SPOTTED_AWARDS = [
  { count: 10, text: 'has been spotted on 10 squares 👀 Most Spotted: Bronze 🥉' },
  { count: 20, text: 'has been spotted on 20 squares 👀👀 Most Spotted: Silver 🥈' },
  { count: 40, text: 'has been spotted on 40 squares 🤯 Most Spotted: GOLD 🥇 Who even ARE you' }
];

// Ordered smallest to biggest. `type` drives styling and banners on the client.
const MILESTONES = [
  { key: 'squares4', type: 'score', isReached: (player) => player.score >= 4, text: () => 'is off to a hot start with 4 squares 🔥' },
  { key: 'bingo1', type: 'bingo', isReached: (player) => player.bingos >= 1, text: () => 'got BINGO! 🤪' },
  { key: 'bingo2', type: 'bingo', isReached: (player) => player.bingos >= 2, text: () => 'got a DOUBLE BINGO bitchesss! 🤙😎🎉' },
  { key: 'squares23', type: 'score', isReached: (player) => player.score >= 23, text: () => 'is ONE square away from a full board 😱' },
  {
    key: 'fullBoard',
    type: 'fullBoard',
    isReached: (player) => player.score >= FULL_BOARD_SCORE,
    text: () => FULL_BOARD_LINES[Math.floor(Math.random() * FULL_BOARD_LINES.length)]
  }
];

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(commands) {
  const response = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commands)
  });

  if (!response.ok) {
    throw new Error(`Redis request failed: ${response.status}`);
  }

  const results = await response.json();
  return results.map((entry) => {
    if (entry.error) {
      throw new Error(entry.error);
    }
    return entry.result;
  });
}

function inboxKey(playerId) {
  return `bingo:inbox:${playerId}`;
}

function spottersKey(playerId) {
  return `bingo:spotters:${playerId}`;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function toPlayerMap(hashResult) {
  const players = {};
  for (let index = 0; index < (hashResult || []).length; index += 2) {
    const player = parseJson(hashResult[index + 1]);
    if (player) {
      players[hashResult[index]] = player;
    }
  }
  return players;
}

function cleanText(value, maxLength, fallback) {
  const text = typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
  return text || fallback;
}

function cleanInt(value, max) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.min(Math.max(number, 0), max) : 0;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  return parseJson(req.body) || {};
}

function buildSnapshot(players, feed, now) {
  const list = Object.entries(players)
    .filter(([, player]) => now - player.lastSeen < STALE_PLAYER_MS)
    .map(([id, player]) => ({
      id,
      name: player.name,
      emoji: player.emoji,
      score: player.score,
      bingos: player.bingos,
      online: !player.left && now - player.lastSeen < ONLINE_WINDOW_MS
    }));

  return {
    now,
    players: list,
    onlineCount: list.filter((player) => player.online).length,
    feed: (feed || []).map(parseJson).filter(Boolean)
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!REDIS_URL || !REDIS_TOKEN) {
    res.status(503).json({ error: 'Shared storage is not configured.' });
    return;
  }

  const now = Date.now();

  try {
    if (req.method === 'GET') {
      const [playerHash, feed] = await redis([
        ['HGETALL', PLAYERS_KEY],
        ['LRANGE', FEED_KEY, 0, FEED_LENGTH - 1]
      ]);
      res.status(200).json(buildSnapshot(toPlayerMap(playerHash), feed, now));
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed.' });
      return;
    }

    const body = readBody(req);
    const id = cleanText(body.id, 64, '');
    if (!id) {
      res.status(400).json({ error: 'Missing player id.' });
      return;
    }

    const isLeaving = body.leave === true;
    const secret = cleanText(body.secret, 64, '');
    const [playerHash, feed, inbox] = await redis([
      ['HGETALL', PLAYERS_KEY],
      ['LRANGE', FEED_KEY, 0, FEED_LENGTH - 1],
      ['LRANGE', inboxKey(id), 0, INBOX_LENGTH - 1]
    ]);
    const players = toPlayerMap(playerHash);
    const previous = players[id];

    // Player ids are visible to everyone, so a per-device secret stops other phones from
    // posting as someone else (and reading their private spotted notifications).
    if (previous && previous.secret && previous.secret !== secret) {
      res.status(403).json({ error: 'This player belongs to another device.' });
      return;
    }

    const player = {
      name: cleanText(body.name, 40, 'Guest'),
      emoji: cleanText(body.emoji, 16, '🐸'),
      score: cleanInt(body.score, 24),
      bingos: cleanInt(body.bingos, 12),
      lastSeen: now,
      left: isLeaving,
      secret: secret || (previous && previous.secret) || '',
      milestones: (previous && Array.isArray(previous.milestones)) ? previous.milestones : []
    };
    players[id] = player;

    const events = [];
    const addEvent = (type, text) => {
      events.push({ id: `${now}-${id}-${type}`, type, playerId: id, emoji: player.emoji, name: player.name, text });
    };
    if (!previous) {
      addEvent('join', 'joined the party');
    } else if (previous.left && !player.left && now - previous.lastSeen > 10 * 60 * 1000) {
      addEvent('return', 'is back');
    }
    if (previous && (previous.name !== player.name || previous.emoji !== player.emoji)) {
      addEvent('rename', `is the new look for ${previous.emoji} ${previous.name}`);
    }
    // Progress only reaches the feed at a few milestones, each announced once per player so
    // clearing progress or dealing a new card can't repeat them. When several are reached in
    // one sync, only the biggest is announced and the smaller ones are marked as done.
    const reached = MILESTONES.filter((milestone) => (
      !player.milestones.includes(milestone.key) && milestone.isReached(player)
    ));
    if (reached.length) {
      const biggest = reached[reached.length - 1];
      addEvent(biggest.type, biggest.text());
      player.milestones = [...player.milestones, ...reached.map((milestone) => milestone.key)];
    }

    const writes = [
      ['HSET', PLAYERS_KEY, id, JSON.stringify(player)],
      ['EXPIRE', PLAYERS_KEY, KEY_TTL_SECONDS]
    ];

    // Spots go only to the spotted player's private inbox, never the shared feed, so other
    // guests with the same square don't get the answer.
    const spots = (Array.isArray(body.spots) ? body.spots : [])
      .slice(0, MAX_SPOTS_PER_REQUEST)
      .map((spot) => ({ targetId: cleanText(spot && spot.targetId, 64, ''), prompt: cleanText(spot && spot.prompt, 160, '') }))
      .filter((spot) => spot.targetId && spot.targetId !== id && players[spot.targetId] && spot.prompt);

    if (spots.length) {
      // Each spotter + square counts once, so un-marking and re-picking someone can't
      // inflate their total or send them repeat notifications.
      const spotResults = await redis(spots.flatMap((spot) => [
        ['SADD', spottersKey(spot.targetId), `${id}|${spot.prompt}`],
        ['SCARD', spottersKey(spot.targetId)],
        ['EXPIRE', spottersKey(spot.targetId), KEY_TTL_SECONDS]
      ]));

      spots.forEach((spot, index) => {
        const isNewSpot = spotResults[index * 3] === 1;
        const spottedTotal = spotResults[index * 3 + 1];
        if (!isNewSpot) {
          return;
        }

        const notification = { id: `${now}-${id}-${index}`, fromName: player.name, fromEmoji: player.emoji, prompt: spot.prompt, at: now };
        writes.push(['LPUSH', inboxKey(spot.targetId), JSON.stringify(notification)]);
        writes.push(['LTRIM', inboxKey(spot.targetId), 0, INBOX_LENGTH - 1]);
        writes.push(['EXPIRE', inboxKey(spot.targetId), KEY_TTL_SECONDS]);

        // Only the count is announced, never which squares, so nothing is spoiled.
        const award = SPOTTED_AWARDS.find((entry) => entry.count === spottedTotal);
        if (award) {
          const target = players[spot.targetId];
          events.push({
            id: `${now}-${spot.targetId}-spotted${award.count}`,
            type: 'spottedAward',
            playerId: spot.targetId,
            emoji: target.emoji,
            name: target.name,
            text: award.text
          });
        }
      });
    }

    const newFeedEntries = events.map((event) => JSON.stringify({ ...event, at: now }));
    if (newFeedEntries.length) {
      writes.push(['LPUSH', FEED_KEY, ...newFeedEntries]);
      writes.push(['LTRIM', FEED_KEY, 0, FEED_LENGTH - 1]);
      writes.push(['EXPIRE', FEED_KEY, KEY_TTL_SECONDS]);
    }

    // A leave beacon's response is never read, so keep the inbox for the next visit.
    const spotted = isLeaving ? [] : (inbox || []).map(parseJson).filter(Boolean).reverse();
    if (spotted.length) {
      // New spots are pushed to the head, so trim only the delivered ones off the tail.
      writes.push(['LTRIM', inboxKey(id), 0, -(spotted.length + 1)]);
    }

    const staleIds = Object.keys(players).filter((playerId) => now - players[playerId].lastSeen >= STALE_PLAYER_MS);
    if (staleIds.length) {
      writes.push(['HDEL', PLAYERS_KEY, ...staleIds]);
    }
    await redis(writes);

    const combinedFeed = [...newFeedEntries.reverse(), ...(feed || [])].slice(0, FEED_LENGTH);
    res.status(200).json({ ...buildSnapshot(players, combinedFeed, now), spotted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not reach shared storage.' });
  }
};

const STORAGE_KEY = 'housewarming-bingo-state-v1';
const PLAYER_PROFILE_KEY = 'housewarming-bingo-player-profile-v1';
const PANEL_STATE_KEY = 'housewarming-bingo-panels-v1';
const PRESENCE_ENDPOINT = '/api/presence';
const SYNC_INTERVAL_MS = 8000;
const LEADERBOARD_SIZE = 10;
const EMOJI_OPTIONS = ['🐸','🐱','🐙','🦋','🦈','🍒','🍓','🥑','🍸','🪩','👽','🤠','🤡','🐧','🦖','🌷','🐝','🧃','🦀','🎀','🐶','🦄','🌈','🍉','🪐','🌙','🎉','🍔','🧁','🔥'];
const FREE_INDEX = 12;
const WINNING_LINES = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20]
];

const BINGO_PROMPTS = [
  { id: 'prompt-01', text: 'Has been friends with a host for 10+ years' },
  { id: 'prompt-02', text: 'Has been to both Hong Kong and Shanghai' },
  { id: 'prompt-03', text: 'Is currently unemployed' },
  { id: 'prompt-04', text: 'Has a really niche hobby' },
  { id: 'prompt-05', text: 'Knows what SMIC stands for' },
  { id: 'prompt-06', text: 'Has attended boarding school' },
  { id: 'prompt-07', text: 'Has kissed someone at this party' },
  { id: 'prompt-08', text: 'Can do the worm' },
  { id: 'prompt-09', text: 'Has been to Geronimo’s' },
  { id: 'prompt-10', text: 'Has partied on a bouncy club dance floor' },
  { id: 'prompt-11', text: 'Has seen a host black out drunk' },
  { id: 'prompt-12', text: 'Has slept in the same bed as a host' },
  { id: 'prompt-13', text: 'Knows a host\'s full passport name' },
  { id: 'prompt-14', text: 'Has seen a host throw up' },
  { id: 'prompt-15', text: 'Is the reason two people at this party know each other' },
  { id: 'prompt-16', text: 'Plays pickleball regularly' },
  { id: 'prompt-17', text: 'Goes bouldering regularly' },
  { id: 'prompt-18', text: 'Plays soccer regularly' },
  { id: 'prompt-19', text: 'Plays basketball regularly' },
  { id: 'prompt-20', text: 'Is currently a student' },
  { id: 'prompt-21', text: 'Has tequila as their favorite alcohol' },
  { id: 'prompt-22', text: 'Is allergic to cats' },
  { id: 'prompt-23', text: 'Is over 6\'1" tall' },
  { id: 'prompt-24', text: 'Is under 5\'4" tall' },
  { id: 'prompt-25', text: 'Is staying completely sober tonight' },
  { id: 'prompt-26', text: 'Collects Pokémon cards' },
  { id: 'prompt-27', text: 'Does not work a corporate or white-collar job' },
  { id: 'prompt-28', text: 'Has skipped both breakfast and lunch today' },
  { id: 'prompt-29', text: 'Has a birthday in October' },
  { id: 'prompt-30', text: 'Has lychee as their favorite soju flavor' },
  { id: 'prompt-31', text: 'Does not have a driver\'s license' },
  { id: 'prompt-32', text: 'Has taken more than 10 AP classes in high school' },
  { id: 'prompt-33', text: 'Has spread a crazy rumor about Cynthia' },
  { id: 'prompt-34', text: 'Has never had a cavity' },
  { id: 'prompt-35', text: 'Has a twin' },
  { id: 'prompt-36', text: 'Has a tattoo they regret' },
  { id: 'prompt-37', text: 'Has been arrested' },
  { id: 'prompt-38', text: 'Has lost their phone on a night out' },
  { id: 'prompt-39', text: 'Can name all three hosts\' birthdays' },
  { id: 'prompt-40', text: 'Can touch their tongue to their nose' }
];

const QUESTION_BANK = BINGO_PROMPTS.map((prompt) => prompt.text);

const HOSTS = ['Cynthia', 'Natasha', 'Kathryn'];

// Returns a random host name each time it's called.
const Host = () => HOSTS[Math.floor(Math.random() * HOSTS.length)];

// Fills "[Host 1]", "[Host 2]", ... in a prompt with random hosts. Different numbers always
// get different hosts, and a repeated number reuses the same host within that prompt.
function fillHostPlaceholders(text) {
  const shuffledHosts = shuffle(HOSTS);
  return text.replace(/\[Host (\d+)\]/g, (_, number) => shuffledHosts[(Number(number) - 1) % HOSTS.length] || Host());
}

const state = {
  playerId: '',
  playerSecret: '',
  playerName: '',
  selectedEmoji: '🐸',
  card: Array(25).fill(''),
  completed: Array(25).fill(false),
  squareNames: Array(25).fill(''),
  squarePlayerIds: Array(25).fill(''),
  promptIds: Array(25).fill(''),
  lastCelebratedKey: '',
  isJoined: false
};

const boardElement = document.getElementById('board');
const progressLabel = document.getElementById('progressLabel');
const newCardButton = document.getElementById('newCardButton');
const clearProgressButton = document.getElementById('clearProgressButton');
const bingoToast = document.getElementById('bingoToast');
const dismissBingoButton = document.getElementById('dismissBingoButton');
const confettiLayer = document.getElementById('confettiLayer');
const joinScreen = document.getElementById('joinScreen');
const gameScreen = document.getElementById('gameScreen');
const guestNameInput = document.getElementById('guestNameInput');
const joinButton = document.getElementById('joinButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const squareModal = document.getElementById('squareModal');
const squareModalPrompt = document.getElementById('squareModalPrompt');
const squarePlayerList = document.getElementById('squarePlayerList');
const squarePlayerEmpty = document.getElementById('squarePlayerEmpty');
const squareNameInput = document.getElementById('squareNameInput');
const saveSquareButton = document.getElementById('saveSquareButton');
const removeSquareButton = document.getElementById('removeSquareButton');
const closeSquareButton = document.getElementById('closeSquareButton');
const emojiGrid = document.getElementById('emojiGrid');
const selectedEmojiPreview = document.getElementById('selectedEmojiPreview');
const livePlayerCount = document.getElementById('livePlayerCount');
const currentPlayerChip = document.getElementById('currentPlayerChip');
const currentPlayerAvatar = document.getElementById('currentPlayerAvatar');
const currentPlayerName = document.getElementById('currentPlayerName');
const leaderboardList = document.getElementById('leaderboardList');
const whosHereList = document.getElementById('whosHereList');
const whosHereCount = document.getElementById('whosHereCount');
const leaderboardRank = document.getElementById('leaderboardRank');
const collapsiblePanels = document.querySelectorAll('.collapsible-panel');
const activityFeed = document.getElementById('activityFeed');
const partyAnnouncement = document.getElementById('partyAnnouncement');
const partyAnnouncementText = document.getElementById('partyAnnouncementText');
const partyAnnouncementTag = document.getElementById('partyAnnouncementTag');
const spottedToast = document.getElementById('spottedToast');
const spottedToastFrom = document.getElementById('spottedToastFrom');
const spottedToastPrompt = document.getElementById('spottedToastPrompt');
const bingoToastTag = document.getElementById('bingoToastTag');
const bingoToastCopy = document.getElementById('bingoToastCopy');

function shuffle(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function getPromptPool() {
  return shuffle(BINGO_PROMPTS.map((prompt) => ({ ...prompt })));
}

function createFreshCard() {
  const promptTiles = getPromptPool().slice(0, 24);
  const positions = shuffle(Array.from({ length: 25 }, (_, index) => index).filter((index) => index !== FREE_INDEX));

  const card = Array(25).fill('');
  const promptIds = Array(25).fill('');
  card[FREE_INDEX] = 'FREE';

  promptTiles.forEach((prompt, index) => {
    const slot = positions[index];
    card[slot] = fillHostPlaceholders(prompt.text);
    promptIds[slot] = prompt.id;
  });

  state.card = card;
  state.promptIds = promptIds;
  state.completed = Array(25).fill(false);
  state.squareNames = Array(25).fill('');
  state.squarePlayerIds = Array(25).fill('');
  state.completed[FREE_INDEX] = true;
  state.lastCelebratedKey = '';
  hideBingoToast();
  saveState();
}

function buildPlayerId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `player-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const party = {
  players: [],
  feed: [],
  clockOffset: 0,
  connected: false,
  hasSynced: false,
  seenEventIds: new Set(),
  feedPrimed: false
};

let syncTimer = null;
let queuedSyncTimer = null;
let syncInFlight = false;
let resyncAfterFlight = false;
let announcementTimer = null;
let profileBeforeEdit = null;
let activeSquareIndex = null;
let spottedTimer = null;
const pendingSpots = [];
const spottedQueue = [];

function buildHeartbeat(extra = {}) {
  return {
    id: state.playerId,
    secret: state.playerSecret,
    name: state.playerName,
    emoji: state.selectedEmoji,
    score: getCompletedCount(),
    bingos: getWinningLines().length,
    ...extra
  };
}

function getEventKey(entry) {
  return entry.id || `${entry.at}-${entry.name}-${entry.text}`;
}

// Announce other players' bingos and full boards that arrived since the last sync. The first
// sync only records what's already in the feed so old wins aren't replayed on load.
function announceNewBingos(feed) {
  const isFirstLoad = !party.feedPrimed;
  party.feedPrimed = true;
  // Your own bingos already get the full-screen toast, but a Most Spotted award is earned by
  // other people's picks, so it's announced to the winner too.
  const newWins = feed.filter((entry) => (
    ((entry.type === 'bingo' || entry.type === 'fullBoard') && entry.playerId !== state.playerId
      || entry.type === 'spottedAward')
    && !party.seenEventIds.has(getEventKey(entry))
  ));

  feed.forEach((entry) => party.seenEventIds.add(getEventKey(entry)));

  if (!isFirstLoad && newWins.length) {
    showPartyAnnouncement(
      newWins.find((entry) => entry.type === 'fullBoard')
      || newWins.find((entry) => entry.type === 'spottedAward')
      || newWins[0]
    );
  }
}

function showPartyAnnouncement(entry) {
  const isFullBoard = entry.type === 'fullBoard';
  const isSpottedAward = entry.type === 'spottedAward';
  partyAnnouncementTag.textContent = isFullBoard ? 'FULL BOARD! 🦋' : isSpottedAward ? 'MOST SPOTTED 👀' : 'BINGO!';
  partyAnnouncementText.textContent = `${entry.emoji} ${entry.name} ${entry.text}`;
  partyAnnouncement.classList.toggle('is-full-board', isFullBoard);
  partyAnnouncement.classList.toggle('is-spotted-award', isSpottedAward);
  partyAnnouncement.hidden = false;
  if (bingoToast.hidden) {
    triggerConfetti(isFullBoard ? 160 : 60);
  }
  window.clearTimeout(announcementTimer);
  announcementTimer = window.setTimeout(hidePartyAnnouncement, isFullBoard ? 10000 : 6000);
}

function hidePartyAnnouncement() {
  partyAnnouncement.hidden = true;
}

function applySnapshot(snapshot) {
  party.players = Array.isArray(snapshot.players) ? snapshot.players : [];
  party.feed = Array.isArray(snapshot.feed) ? snapshot.feed : [];
  party.clockOffset = Number(snapshot.now) ? snapshot.now - Date.now() : 0;
  party.connected = true;
  announceNewBingos(party.feed);
  if (Array.isArray(snapshot.spotted)) {
    snapshot.spotted.forEach((spot) => spottedQueue.push(spot));
    showNextSpotted();
  }
}

// Private "you were spotted" notes. These only ever come back in this player's own sync
// response, so the answer isn't spoiled for anyone else with the same square.
function showNextSpotted() {
  if (!spottedToast.hidden || !spottedQueue.length) {
    return;
  }

  const spot = spottedQueue.shift();
  spottedToastFrom.textContent = `${spot.fromEmoji} ${spot.fromName} put you on their card:`;
  spottedToastPrompt.textContent = `“${spot.prompt}”`;
  spottedToast.hidden = false;
  triggerEyeWaterfall();
  if (navigator.vibrate) {
    navigator.vibrate(120);
  }
  window.clearTimeout(spottedTimer);
  spottedTimer = window.setTimeout(hideSpotted, 7000);
}

// A slow, spaced-out stream of 👀 down both edges of the screen, leaving the board clear.
// Eyes are released steadily over EYE_WATERFALL_SECONDS instead of all at once.
const EYE_WATERFALL_COUNT = 24;
const EYE_WATERFALL_SECONDS = 5;

function triggerEyeWaterfall() {
  const gap = EYE_WATERFALL_SECONDS / EYE_WATERFALL_COUNT;

  for (let index = 0; index < EYE_WATERFALL_COUNT; index += 1) {
    const drop = document.createElement('span');
    const onLeft = index % 2 === 0;
    drop.className = 'eye-drop';
    drop.textContent = '👀';
    drop.style[onLeft ? 'left' : 'right'] = `${1 + Math.random() * 9}vw`;
    drop.style.fontSize = `${1.2 + Math.random() * 1}rem`;
    drop.style.animationDelay = `${index * gap + Math.random() * gap * 0.5}s`;
    drop.style.setProperty('--spin', `${(Math.random() - 0.5) * 120}deg`);
    drop.addEventListener('animationend', () => drop.remove());
    document.body.appendChild(drop);
  }
}

function hideSpotted() {
  window.clearTimeout(spottedTimer);
  spottedToast.hidden = true;
  window.setTimeout(showNextSpotted, 400);
}

async function syncPresence() {
  if (syncInFlight) {
    // A change landed mid-request; send it as soon as this one finishes.
    resyncAfterFlight = true;
    return;
  }
  syncInFlight = true;

  // Spots added while this request is in flight stay queued for the next one.
  const sentSpotCount = state.isJoined ? pendingSpots.length : 0;

  try {
    const response = state.isJoined
      ? await fetch(PRESENCE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildHeartbeat({ spots: pendingSpots.slice(0, sentSpotCount) }))
        })
      : await fetch(PRESENCE_ENDPOINT);

    if (!response.ok) {
      throw new Error(`Presence sync failed: ${response.status}`);
    }
    pendingSpots.splice(0, sentSpotCount);
    applySnapshot(await response.json());
  } catch (error) {
    console.warn('Could not sync with the party:', error);
    party.connected = false;
  } finally {
    party.hasSynced = true;
    syncInFlight = false;
  }

  renderPartyPanels();

  if (resyncAfterFlight) {
    resyncAfterFlight = false;
    syncPresence();
  }
}

function queueSync() {
  window.clearTimeout(queuedSyncTimer);
  queuedSyncTimer = window.setTimeout(syncPresence, 300);
}

function startSyncLoop() {
  window.clearInterval(syncTimer);
  syncPresence();
  syncTimer = window.setInterval(syncPresence, SYNC_INTERVAL_MS);
}

function stopSyncLoop() {
  window.clearInterval(syncTimer);
  syncTimer = null;
}

function sendLeaveBeacon() {
  if (!state.isJoined || !navigator.sendBeacon) {
    return;
  }
  const payload = new Blob([JSON.stringify(buildHeartbeat({ leave: true }))], { type: 'application/json' });
  navigator.sendBeacon(PRESENCE_ENDPOINT, payload);
}

// Server data lags behind local taps, so always show this device's live profile and score.
function getPartyPlayers() {
  const others = party.players.filter((player) => player.id !== state.playerId);
  if (!state.isJoined) {
    return others;
  }
  return [
    ...others,
    {
      id: state.playerId,
      name: state.playerName || 'Guest',
      emoji: state.selectedEmoji || '🐸',
      score: getCompletedCount(),
      online: true,
      isSelf: true
    }
  ];
}

function formatTimeAgo(timestamp) {
  const seconds = Math.max(0, Math.round((Date.now() + party.clockOffset - timestamp) / 1000));
  if (seconds < 45) {
    return 'just now';
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  return `${Math.round(minutes / 60)}h ago`;
}

function updatePlayerBadge() {
  currentPlayerAvatar.textContent = state.selectedEmoji;
  currentPlayerName.textContent = state.playerName.trim() || 'Guest';
}

function updateLivePlayerCount() {
  const onlineCount = getPartyPlayers().filter((player) => player.online).length;
  livePlayerCount.textContent = String(onlineCount);
}

function renderEmojiPicker() {
  emojiGrid.innerHTML = '';

  EMOJI_OPTIONS.forEach((emoji) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'emoji-option';
    button.textContent = emoji;
    button.setAttribute('aria-label', `Select emoji ${emoji}`);
    if (emoji === state.selectedEmoji) {
      button.classList.add('is-selected');
    }
    button.addEventListener('click', () => {
      state.selectedEmoji = emoji;
      selectedEmojiPreview.textContent = emoji;
      renderEmojiPicker();
      updatePlayerBadge();
    });
    emojiGrid.appendChild(button);
  });

  selectedEmojiPreview.textContent = state.selectedEmoji;
}

function showJoinScreen() {
  joinScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
  updateLivePlayerCount();
  guestNameInput.focus();
}

function showGameScreen() {
  state.isJoined = true;
  joinScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  updatePlayerBadge();
}

function savePlayerProfile() {
  const profile = {
    id: state.playerId,
    secret: state.playerSecret,
    name: state.playerName,
    emoji: state.selectedEmoji
  };
  localStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(profile));
}

function loadPlayerProfile() {
  try {
    const raw = localStorage.getItem(PLAYER_PROFILE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.name !== 'string' || typeof parsed.emoji !== 'string') {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Could not load saved player profile:', error);
    return null;
  }
}

// Reuses the join screen to fix a typo'd name or emoji without touching the card.
function openProfileEditor() {
  profileBeforeEdit = { name: state.playerName, emoji: state.selectedEmoji };
  guestNameInput.value = state.playerName;
  joinButton.textContent = 'Save Changes';
  cancelEditButton.hidden = false;
  renderEmojiPicker();
  showJoinScreen();
}

function closeProfileEditor() {
  profileBeforeEdit = null;
  joinButton.textContent = 'LET\'S PLAY';
  cancelEditButton.hidden = true;
  showGameScreen();
}

function cancelProfileEdit() {
  state.playerName = profileBeforeEdit.name;
  state.selectedEmoji = profileBeforeEdit.emoji;
  renderEmojiPicker();
  closeProfileEditor();
}

function joinGame() {
  const trimmedName = guestNameInput.value.trim();

  if (!trimmedName) {
    window.alert('Please add your name before joining the party.');
    guestNameInput.focus();
    return;
  }

  if (profileBeforeEdit) {
    state.playerName = trimmedName;
    savePlayerProfile();
    closeProfileEditor();
    renderBoard();
    return;
  }

  state.playerName = trimmedName;
  state.selectedEmoji = state.selectedEmoji || '🐸';
  state.playerId = state.playerId || buildPlayerId();
  savePlayerProfile();
  createFreshCard();
  saveState();
  showGameScreen();
  renderBoard();
}

function loadSavedState() {
  const savedProfile = loadPlayerProfile();
  if (savedProfile) {
    state.playerId = savedProfile.id || buildPlayerId();
    state.playerSecret = savedProfile.secret || buildPlayerId();
    state.playerName = savedProfile.name || '';
    state.selectedEmoji = savedProfile.emoji || '🐸';
    if (!savedProfile.secret) {
      savePlayerProfile();
    }
  } else {
    state.playerId = buildPlayerId();
    state.playerSecret = buildPlayerId();
    state.selectedEmoji = '🐸';
  }

  const savedState = localStorage.getItem(STORAGE_KEY);
  if (!savedState) {
    createFreshCard();
    showJoinScreen();
    return;
  }

  try {
    const parsed = JSON.parse(savedState);
    const safeCard = Array.isArray(parsed.card) && parsed.card.length === 25 ? parsed.card : null;
    const safeCompleted = Array.isArray(parsed.completed) && parsed.completed.length === 25 ? parsed.completed : null;
    const safeSquareNames = Array.isArray(parsed.squareNames) && parsed.squareNames.length === 25 ? parsed.squareNames : Array(25).fill('');
    const safePromptIds = Array.isArray(parsed.promptIds) && parsed.promptIds.length === 25 ? parsed.promptIds : Array(25).fill('');
    const safeSquarePlayerIds = Array.isArray(parsed.squarePlayerIds) && parsed.squarePlayerIds.length === 25 ? parsed.squarePlayerIds : Array(25).fill('');

    if (!safeCard || !safeCompleted) {
      createFreshCard();
      if (savedProfile) {
        showGameScreen();
      } else {
        showJoinScreen();
      }
      return;
    }

    state.card = safeCard;
    state.promptIds = safePromptIds.map((value) => typeof value === 'string' ? value : '');
    state.completed = safeCompleted.map((value) => Boolean(value));
    state.squareNames = safeSquareNames.map((value) => typeof value === 'string' ? value : '');
    state.squarePlayerIds = safeSquarePlayerIds.map((value) => typeof value === 'string' ? value : '');
    state.completed[FREE_INDEX] = true;
    state.lastCelebratedKey = '';
    hideBingoToast();

    if (savedProfile) {
      state.playerName = savedProfile.name || '';
      state.selectedEmoji = savedProfile.emoji || '🐸';
      showGameScreen();
    } else {
      showJoinScreen();
    }
  } catch (error) {
    console.warn('Failed to restore saved bingo state:', error);
    createFreshCard();
    showJoinScreen();
  }
}

function saveState() {
  const payload = {
    playerName: state.playerName,
    card: state.card,
    promptIds: state.promptIds,
    completed: state.completed,
    squareNames: state.squareNames,
    squarePlayerIds: state.squarePlayerIds
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function getCompletedCount() {
  return state.completed.filter((value, index) => value && index !== FREE_INDEX).length;
}

function getWinningLines() {
  return WINNING_LINES.filter((line) => line.every((index) => state.completed[index]));
}

function serializeLines(lines) {
  return lines.map((line) => line.join('-')).join('|');
}

function triggerConfetti(pieceCount = 60) {
  confettiLayer.innerHTML = '';

  const colors = ['#ff4fa0', '#d9352b', '#1f6bff', '#ffd863', '#4bb77d'];

  for (let index = 0; index < pieceCount; index += 1) {
    const piece = document.createElement('span');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty('--x', `${(Math.random() - 0.5) * 220}px`);
    piece.style.setProperty('--r', `${(Math.random() - 0.5) * 720}deg`);
    piece.style.animationDelay = `${Math.random() * 0.2}s`;
    confettiLayer.appendChild(piece);
  }
}

function showBingoToast() {
  const winningLines = getWinningLines();
  if (!winningLines.length) {
    hideBingoToast();
    return;
  }

  const toastKey = serializeLines(winningLines);
  if (toastKey === state.lastCelebratedKey) {
    return;
  }

  const isFullBoard = getCompletedCount() === 24;
  bingoToastTag.textContent = isFullBoard ? 'SOCIAL BUTTERFLY 🦋' : 'BINGO!';
  bingoToastCopy.textContent = isFullBoard
    ? 'You filled the whole board. Is there anyone here you haven’t met?'
    : 'You’ve got a line.';
  bingoToast.classList.toggle('is-full-board', isFullBoard);

  state.lastCelebratedKey = toastKey;
  bingoToast.hidden = false;
  bingoToast.setAttribute('aria-hidden', 'false');
  triggerConfetti(isFullBoard ? 160 : 60);
}

function hideBingoToast() {
  bingoToast.hidden = true;
  bingoToast.setAttribute('aria-hidden', 'true');
}

function updateWinningHighlights() {
  const winningLines = getWinningLines();
  const winnerSet = new Set();

  winningLines.forEach((line) => {
    line.forEach((index) => winnerSet.add(index));
  });

  const cells = boardElement.querySelectorAll('.board-cell');
  cells.forEach((cell) => {
    const index = Number(cell.dataset.index);
    cell.classList.toggle('is-winning', winnerSet.has(index));
  });
}

function updateProgress() {
  const completeCount = getCompletedCount();
  progressLabel.textContent = `${completeCount} / 24 completed`;
}

function createAvatar(emoji) {
  const avatar = document.createElement('span');
  avatar.className = 'leaderboard-emoji';
  avatar.textContent = emoji || '🐸';
  return avatar;
}

function renderWhosHere() {
  const onlinePlayers = getPartyPlayers()
    .filter((player) => player.online)
    .sort((a, b) => Number(Boolean(b.isSelf)) - Number(Boolean(a.isSelf)) || a.name.localeCompare(b.name));

  whosHereCount.textContent = String(onlinePlayers.length);
  whosHereList.innerHTML = '';

  onlinePlayers.forEach((player) => {
    const item = document.createElement('li');
    item.className = 'whos-here-item';

    const name = document.createElement('span');
    name.className = 'whos-here-name';
    name.textContent = player.isSelf ? `${player.name} (you)` : player.name;

    item.append(createAvatar(player.emoji), name);
    whosHereList.appendChild(item);
  });
}

function renderLeaderboard() {
  const leaderboard = getPartyPlayers().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const selfIndex = leaderboard.findIndex((player) => player.isSelf);
  leaderboardRank.textContent = selfIndex >= 0 ? `· You’re #${selfIndex + 1} of ${leaderboard.length}` : '';

  leaderboardList.innerHTML = '';

  leaderboard.slice(0, LEADERBOARD_SIZE).forEach((player, index) => {
    const item = document.createElement('li');
    item.className = 'leaderboard-item';
    item.classList.toggle('is-offline', !player.online);

    const rank = document.createElement('span');
    rank.className = 'leaderboard-rank';
    rank.textContent = String(index + 1);

    const name = document.createElement('span');
    name.textContent = player.online ? player.name : `${player.name} (away)`;

    const score = document.createElement('span');
    score.className = 'leaderboard-score';
    score.textContent = String(player.score);

    item.append(rank, createAvatar(player.emoji), name, score);
    leaderboardList.appendChild(item);
  });
}

function addFeedNotice(text) {
  const item = document.createElement('li');
  item.className = 'activity-item activity-notice';
  item.textContent = text;
  activityFeed.appendChild(item);
}

function renderActivityFeed() {
  activityFeed.innerHTML = '';

  if (!party.hasSynced) {
    addFeedNotice('Connecting to the party…');
    return;
  }

  if (!party.connected) {
    addFeedNotice('Can’t reach the party right now. Only your own progress is shown.');
  }

  if (!party.feed.length) {
    if (party.connected) {
      addFeedNotice('Nothing yet. Go find someone!');
    }
    return;
  }

  party.feed.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'activity-item';
    item.classList.toggle('is-bingo', entry.type === 'bingo');
    item.classList.toggle('is-full-board', entry.type === 'fullBoard');
    item.classList.toggle('is-spotted-award', entry.type === 'spottedAward');

    const text = document.createElement('span');
    text.textContent = `${entry.emoji} ${entry.name} ${entry.text}`;

    const time = document.createElement('span');
    time.className = 'activity-time';
    time.textContent = formatTimeAgo(entry.at);

    item.append(text, time);
    activityFeed.appendChild(item);
  });
}

function renderPartyPanels() {
  updateLivePlayerCount();
  renderWhosHere();
  renderLeaderboard();
  renderActivityFeed();
  renderSquarePlayerList();
}

function setSquare(index, name, playerId = '') {
  if (playerId && playerId !== state.squarePlayerIds[index]) {
    pendingSpots.push({ targetId: playerId, prompt: state.card[index] });
  }
  state.squareNames[index] = name;
  state.squarePlayerIds[index] = name ? playerId : '';
  state.completed[index] = Boolean(name);
  saveState();
  closeSquareModal();
  renderBoard();
}

function getPickablePlayers() {
  return getPartyPlayers()
    .filter((player) => player.online && !player.isSelf)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderSquarePlayerList() {
  if (activeSquareIndex === null) {
    return;
  }

  const query = squareNameInput.value.trim().toLowerCase();
  const onlinePlayers = getPickablePlayers();
  const matches = onlinePlayers.filter((player) => player.name.toLowerCase().includes(query));
  const selectedId = state.squarePlayerIds[activeSquareIndex];

  squarePlayerList.innerHTML = '';

  matches.forEach((player) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'square-player-option';
    button.classList.toggle('is-selected', player.id === selectedId);

    const name = document.createElement('span');
    name.textContent = player.name;

    button.append(createAvatar(player.emoji), name);
    button.addEventListener('click', () => setSquare(activeSquareIndex, player.name, player.id));
    item.appendChild(button);
    squarePlayerList.appendChild(item);
  });

  if (!onlinePlayers.length) {
    squarePlayerEmpty.textContent = 'No one else is online yet. Type their name below.';
  } else if (!matches.length) {
    squarePlayerEmpty.textContent = `No player named “${squareNameInput.value.trim()}” online. Tap Save to use that name.`;
  } else {
    squarePlayerEmpty.textContent = '';
  }
  squarePlayerEmpty.hidden = !squarePlayerEmpty.textContent;
}

function openSquareModal(index) {
  activeSquareIndex = index;
  squareModalPrompt.textContent = state.card[index];
  // Names picked from the list stay in the list; only show typed names in the input.
  squareNameInput.value = state.squarePlayerIds[index] ? '' : state.squareNames[index];
  removeSquareButton.hidden = !state.completed[index];
  renderSquarePlayerList();
  squareModal.hidden = false;
}

function closeSquareModal() {
  activeSquareIndex = null;
  squareModal.hidden = true;
}

function saveTypedSquareName() {
  const typedName = squareNameInput.value.trim();
  if (!typedName) {
    squareNameInput.focus();
    return;
  }

  const matchingPlayer = getPickablePlayers().find((player) => player.name.toLowerCase() === typedName.toLowerCase());
  setSquare(activeSquareIndex, matchingPlayer ? matchingPlayer.name : typedName, matchingPlayer ? matchingPlayer.id : '');
}

function toggleCell(index) {
  if (index === FREE_INDEX) {
    return;
  }

  openSquareModal(index);
}

function renderBoard() {
  boardElement.innerHTML = '';

  state.card.forEach((prompt, index) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'board-cell';
    cell.dataset.index = String(index);
    cell.setAttribute('role', 'gridcell');

    const isFree = index === FREE_INDEX;
    const isComplete = state.completed[index];

    if (isFree) {
      cell.classList.add('free');
      cell.setAttribute('aria-label', 'Free space');
    } else {
      cell.setAttribute('aria-label', `Square ${index + 1}: ${prompt}`);
    }

    if (isComplete) {
      cell.classList.add('is-complete');
    }

    const text = document.createElement('span');
    text.className = 'cell-text';
    text.textContent = isFree ? 'FREE' : prompt;
    cell.appendChild(text);

    const checkmark = document.createElement('span');
    checkmark.className = 'cell-check';
    checkmark.textContent = '✓';
    cell.appendChild(checkmark);

    cell.addEventListener('click', () => toggleCell(index));
    boardElement.appendChild(cell);
  });

  updateWinningHighlights();
  updateProgress();
  renderPartyPanels();
  showBingoToast();
  queueSync();
}

function resetCard() {
  const shouldReset = window.confirm('Start a fresh card? Your current progress and card will be lost.');
  if (!shouldReset) {
    return;
  }

  createFreshCard();
  renderBoard();
}

function clearProgress() {
  const completedCount = getCompletedCount();
  if (!completedCount) {
    return;
  }

  const shouldClear = window.confirm(
    `Clear all ${completedCount} completed square${completedCount === 1 ? '' : 's'}? `
    + 'The names you entered will be erased and your leaderboard score will reset to 0. This can’t be undone.'
  );
  if (!shouldClear) {
    return;
  }

  state.completed = Array(25).fill(false);
  state.squareNames = Array(25).fill('');
  state.squarePlayerIds = Array(25).fill('');
  state.completed[FREE_INDEX] = true;
  state.lastCelebratedKey = '';
  hideBingoToast();
  saveState();
  renderBoard();
}

newCardButton.addEventListener('click', resetCard);
clearProgressButton.addEventListener('click', clearProgress);
dismissBingoButton.addEventListener('click', hideBingoToast);
joinButton.addEventListener('click', joinGame);
cancelEditButton.addEventListener('click', cancelProfileEdit);
currentPlayerChip.addEventListener('click', openProfileEditor);
guestNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    joinGame();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !bingoToast.hidden) {
    hideBingoToast();
  }

  if (event.key === 'Escape' && !squareModal.hidden) {
    closeSquareModal();
  }
});

closeSquareButton.addEventListener('click', closeSquareModal);
saveSquareButton.addEventListener('click', saveTypedSquareName);
removeSquareButton.addEventListener('click', () => setSquare(activeSquareIndex, ''));
squareNameInput.addEventListener('input', renderSquarePlayerList);
squareNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    saveTypedSquareName();
  }
});
squareModal.addEventListener('click', (event) => {
  if (event.target === squareModal) {
    closeSquareModal();
  }
});

// Remember which panels each guest collapsed. Storage can be unavailable (private mode), so
// panels just default to open in that case.
function restorePanelState() {
  let savedPanels = {};
  try {
    savedPanels = JSON.parse(localStorage.getItem(PANEL_STATE_KEY)) || {};
  } catch (error) {
    savedPanels = {};
  }

  collapsiblePanels.forEach((panel) => {
    if (typeof savedPanels[panel.id] === 'boolean') {
      panel.open = savedPanels[panel.id];
    }
    panel.addEventListener('toggle', () => {
      savedPanels[panel.id] = panel.open;
      try {
        localStorage.setItem(PANEL_STATE_KEY, JSON.stringify(savedPanels));
      } catch (error) {
        console.warn('Could not save panel state:', error);
      }
    });
  });
}

restorePanelState();
partyAnnouncement.addEventListener('click', hidePartyAnnouncement);
spottedToast.addEventListener('click', hideSpotted);
window.addEventListener('pagehide', sendLeaveBeacon);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    startSyncLoop();
  } else {
    stopSyncLoop();
  }
});

renderEmojiPicker();
loadSavedState();
startSyncLoop();

if (state.playerName.trim()) {
  guestNameInput.value = state.playerName;
  renderBoard();
} else {
  showJoinScreen();
}

/**
 * p2p-network.js
 * P2P WebRTC движок (PeerJS), в котором ХОСТ ЯВЛЯЕТСЯ ПОЛНОЦЕННЫМ УЧАСТНИКОМ ИГРЫ,
 * с поддержкой разделения сценки на фрагменты, 30-секундного голосования и досрочного завершения.
 */

import { getActiveFragments } from './clips-data.js';

const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
};

/**
 * Хост (Создатель комнаты) — полноценный участник
 */
export class HostP2PManager {
  constructor(roomCode, hostNickname = 'Хост', hostAvatar = '👑', options = {}) {
    this.roomCode = roomCode.toUpperCase();
    this.hostNickname = hostNickname;
    this.hostAvatar = hostAvatar;
    this.peerId = `dt-${this.roomCode}`;
    this.peer = null;
    this.connections = new Map(); // peerId -> DataConnection
    this.players = new Map(); // peerId -> Player Object
    this.stage = 'LOBBY';
    this.currentClip = null;
    this.activeFragments = [];
    this.votingTimer = null;
    this.votingTimeRemaining = 30;

    this.onStatusChange = options.onStatusChange || (() => {});
    this.onReaction = options.onReaction || (() => {});
    this.onCodeTaken = options.onCodeTaken || (() => {});
    this.onAllAudioReady = options.onAllAudioReady || (() => {});
    this.onHostAssigned = options.onHostAssigned || (() => {});
    this.onStateUpdate = options.onStateUpdate || (() => {});
    this.onVotingTick = options.onVotingTick || (() => {});

    // Регистрируем ХОСТА как первого полноценного игрока в комнате!
    this.players.set('host', {
      playerId: 'host',
      nickname: this.hostNickname,
      avatarId: this.hostAvatar,
      isHost: true,
      micReady: true,
      assignedFragment: null,
      hasAudio: false,
      audioArrayBuffer: null,
      audioBlobUrl: null,
      mimeType: 'audio/webm',
      score: 0,
      votes: 0
    });
  }

  init() {
    return new Promise((resolve) => {
      // @ts-ignore
      this.peer = new window.Peer(this.peerId, PEER_CONFIG);

      this.peer.on('open', (id) => {
        console.log(`[HostP2P] Комната открыта, Host PeerID: ${id}`);
        this.onStatusChange('connected');
        this.broadcastRoomState();
        resolve(id);
      });

      this.peer.on('error', (err) => {
        console.error('[HostP2P] Ошибка PeerJS:', err);
        if (err.type === 'unavailable-id') {
          this.onCodeTaken();
        }
        this.onStatusChange('error');
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });
    });
  }

  handleIncomingConnection(conn) {
    conn.on('open', () => {
      console.log(`[HostP2P] Подключился гость: ${conn.peer}`);
      this.connections.set(conn.peer, conn);
    });

    conn.on('data', (data) => {
      this.handleClientMessage(conn, data);
    });

    conn.on('close', () => {
      console.log(`[HostP2P] Отключился игрок: ${conn.peer}`);
      this.connections.delete(conn.peer);
      this.players.delete(conn.peer);
      this.broadcastRoomState();
    });
  }

  handleClientMessage(conn, msg) {
    if (!msg || !msg.event) return;
    const { event, payload } = msg;

    // NTP-калибровка времени
    if (event === 'client:time:sync_request') {
      const now = performance.now() + performance.timeOrigin;
      conn.send({
        event: 'server:time:sync_response',
        payload: { t0: payload.t0, t1: now, t2: now }
      });
      return;
    }

    // Вход нового игрока
    if (event === 'client:room:join') {
      const player = {
        playerId: conn.peer,
        nickname: payload.nickname || 'Игрок',
        avatarId: payload.avatarId || '🦊',
        isHost: false,
        micReady: false,
        assignedFragment: null,
        hasAudio: false,
        audioArrayBuffer: null,
        audioBlobUrl: null,
        mimeType: 'audio/webm',
        score: 0,
        votes: 0
      };
      this.players.set(conn.peer, player);

      conn.send({
        event: 'server:room:joined',
        payload: { playerId: player.playerId, currentStage: this.stage }
      });

      this.broadcastRoomState();
      return;
    }

    // Готовность микрофона
    if (event === 'client:player:mic_ready') {
      const player = this.players.get(conn.peer);
      if (player) {
        player.micReady = true;
        this.broadcastRoomState();
      }
      return;
    }

    // Получение аудиодорожки от гостя
    if (event === 'client:game:audio_data') {
      const player = this.players.get(conn.peer);
      if (player) {
        player.hasAudio = true;
        player.audioArrayBuffer = payload.audioArrayBuffer;
        player.mimeType = payload.mimeType;

        // Создаем blob URL для прослушивания
        const blob = new Blob([player.audioArrayBuffer], { type: player.mimeType });
        player.audioBlobUrl = URL.createObjectURL(blob);

        console.log(`[HostP2P] Аудио получено от ${player.nickname} (${player.audioArrayBuffer.byteLength} байт)`);
        this.broadcastRoomState();
        this.checkAllAudioReady();
      }
      return;
    }

    // Реакции
    if (event === 'client:game:reaction') {
      this.onReaction(payload.emoji);
      this.broadcast('server:game:reaction', { emoji: payload.emoji });
      return;
    }

    // Голосование
    if (event === 'client:game:vote') {
      const target = this.players.get(payload.targetPlayerId);
      if (target) {
        target.votes += 1;
        this.broadcastRoomState();
        this.checkAllVoted();
      }
      return;
    }
  }

  // Хост записывает и сохраняет свою собственную аудиодорожку!
  submitHostAudio(arrayBuffer, mimeType, blobUrl) {
    const hostPlayer = this.players.get('host');
    if (hostPlayer) {
      hostPlayer.hasAudio = true;
      hostPlayer.audioArrayBuffer = arrayBuffer;
      hostPlayer.mimeType = mimeType;
      hostPlayer.audioBlobUrl = blobUrl;
      console.log(`[HostP2P] Хост сохранил свою аудиодорожку (${arrayBuffer.byteLength} байт)`);
      this.broadcastRoomState();
      this.checkAllAudioReady();
    }
  }

  checkAllAudioReady() {
    const active = Array.from(this.players.values()).filter(p => p.assignedFragment);
    if (active.length > 0 && active.every(p => p.hasAudio)) {
      this.onAllAudioReady();
    }
  }

  checkAllVoted() {
    const totalVotes = Array.from(this.players.values()).reduce((sum, p) => sum + p.votes, 0);
    if (totalVotes >= this.players.size) {
      this.finishVotingEarly();
    }
  }

  broadcast(event, payload) {
    const msg = { event, payload };
    this.connections.forEach((conn) => {
      if (conn.open) {
        try { conn.send(msg); } catch (e) { console.warn(e); }
      }
    });
  }

  broadcastRoomState() {
    const playersList = Array.from(this.players.values()).map(p => ({
      playerId: p.playerId,
      nickname: p.nickname,
      avatarId: p.avatarId,
      isHost: p.isHost,
      micReady: p.micReady,
      assignedFragment: p.assignedFragment,
      hasAudio: p.hasAudio,
      audioBlobUrl: p.audioBlobUrl,
      score: p.score,
      votes: p.votes
    }));

    const statePayload = {
      roomCode: this.roomCode,
      stage: this.stage,
      players: playersList,
      votingTimeRemaining: this.votingTimeRemaining
    };

    this.broadcast('server:room:state_update', statePayload);
    this.onStateUpdate(statePayload);
  }

  startPreview(clip) {
    this.stage = 'PREVIEW';
    this.currentClip = clip;
    const allPlayers = Array.from(this.players.values());

    // Генерируем фрагменты под реальное количество игроков в комнате
    this.activeFragments = getActiveFragments(clip, allPlayers.length);

    // Раздаем фрагменты каждому игроку случайно/по очереди, ВКЛЮЧАЯ ХОСТА!
    allPlayers.forEach((player, idx) => {
      const fragment = this.activeFragments[idx % this.activeFragments.length];
      player.assignedFragment = fragment;
      player.hasAudio = false;
      player.audioArrayBuffer = null;
      player.audioBlobUrl = null;
      player.votes = 0;

      // Если это гость, шлем по сокету
      if (!player.isHost) {
        const conn = this.connections.get(player.playerId);
        if (conn && conn.open) {
          conn.send({
            event: 'server:game:role_assign',
            payload: {
              clip,
              fragment,
              allFragments: this.activeFragments
            }
          });
        }
      } else {
        // Если это сам Хост, вызываем callback для локального UI
        this.onHostAssigned(clip, fragment, this.activeFragments);
      }
    });

    this.broadcastRoomState();
  }

  startRecording(countdownMs = 3000) {
    this.stage = 'RECORDING';
    const totalDurationMs = this.activeFragments.length * 4000;
    const nowHost = performance.now() + performance.timeOrigin;
    const startAtHost = nowHost + countdownMs;

    this.broadcast('server:game:start_recording', {
      startAtServerTimestamp: startAtHost,
      totalDurationMs,
      countdownMs,
      fragments: this.activeFragments
    });

    this.broadcastRoomState();
    return { startAtHost, totalDurationMs, countdownMs, fragments: this.activeFragments };
  }

  startPlayback(delayMs = 1200) {
    this.stage = 'PLAYBACK';
    const nowHost = performance.now() + performance.timeOrigin;
    const startAtHost = nowHost + delayMs;

    const tracks = Array.from(this.players.values())
      .filter(p => p.hasAudio)
      .map(p => ({
        playerId: p.playerId,
        nickname: p.nickname,
        avatarId: p.avatarId,
        audioArrayBuffer: p.audioArrayBuffer,
        audioBlobUrl: p.audioBlobUrl,
        fragment: p.assignedFragment
      }));

    this.broadcast('server:game:playback_start', {
      playbackStartAtServerTimestamp: startAtHost,
      clip: this.currentClip,
      tracks: tracks.map(t => ({
        playerId: t.playerId,
        nickname: t.nickname,
        avatarId: t.avatarId,
        audioBlobUrl: t.audioBlobUrl,
        fragment: t.fragment
      }))
    });

    this.broadcastRoomState();
    return { startAtHost, tracks };
  }

  startVoting() {
    this.stage = 'VOTING';
    this.votingTimeRemaining = 30;

    const tracks = Array.from(this.players.values())
      .filter(p => p.hasAudio)
      .map(p => ({
        playerId: p.playerId,
        nickname: p.nickname,
        avatarId: p.avatarId,
        audioBlobUrl: p.audioBlobUrl,
        fragment: p.assignedFragment
      }));

    this.broadcast('server:game:start_voting', {
      votingDurationSec: 30,
      tracks
    });
    this.broadcastRoomState();

    if (this.votingTimer) clearInterval(this.votingTimer);
    this.votingTimer = setInterval(() => {
      this.votingTimeRemaining--;
      this.onVotingTick(this.votingTimeRemaining);

      if (this.votingTimeRemaining <= 0) {
        this.finishVotingEarly();
      }
    }, 1000);
  }

  finishVotingEarly() {
    if (this.votingTimer) {
      clearInterval(this.votingTimer);
      this.votingTimer = null;
    }
    this.calculateResults();
  }

  calculateResults() {
    this.stage = 'RESULTS';
    const leaderboard = Array.from(this.players.values())
      .filter(p => p.assignedFragment)
      .map(p => {
        p.score = (p.votes * 250) + 500 + Math.floor(Math.random() * 250);
        return {
          playerId: p.playerId,
          nickname: p.nickname,
          avatarId: p.avatarId,
          votes: p.votes,
          score: p.score
        };
      })
      .sort((a, b) => b.score - a.score);

    this.broadcast('server:game:results', { leaderboard });
    this.broadcastRoomState();
    return leaderboard;
  }

  returnToLobby() {
    this.stage = 'LOBBY';
    this.currentClip = null;
    this.activeFragments = [];
    this.players.forEach(p => {
      p.assignedFragment = null;
      p.hasAudio = false;
      p.audioArrayBuffer = null;
      p.audioBlobUrl = null;
      p.votes = 0;
    });
    this.broadcastRoomState();
  }

  dispose() {
    if (this.votingTimer) clearInterval(this.votingTimer);
    if (this.peer) this.peer.destroy();
  }
}

/**
 * Клиент (Гость на смартфоне или ПК)
 */
export class ClientP2PManager {
  constructor(roomCode, nickname, avatarId) {
    this.roomCode = roomCode.toUpperCase();
    this.nickname = nickname;
    this.avatarId = avatarId;
    this.peer = null;
    this.conn = null;
    this.serverTimeOffset = 0;
    this.handlers = new Map();
    this.onStatusChange = () => {};
  }

  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push(handler);
  }

  emit(event, payload) {
    const list = this.handlers.get(event) || [];
    list.forEach(fn => fn(payload));
  }

  init() {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      this.peer = new window.Peer(null, PEER_CONFIG);

      this.peer.on('open', () => {
        this.connectToHost(resolve, reject);
      });

      this.peer.on('error', (err) => {
        console.error('[ClientP2P] Ошибка Peer:', err);
        this.onStatusChange('error');
        reject(err);
      });
    });
  }

  connectToHost(resolve, reject) {
    const hostPeerId = `dt-${this.roomCode}`;
    this.conn = this.peer.connect(hostPeerId, { reliable: true });

    this.conn.on('open', async () => {
      this.onStatusChange('connected');
      await this.calibrateClock(6);
      this.send('client:room:join', {
        roomCode: this.roomCode,
        nickname: this.nickname,
        avatarId: this.avatarId
      });
      resolve(this.conn);
    });

    this.conn.on('data', (data) => {
      if (data && data.event) {
        this.emit(data.event, data.payload);
      }
    });

    this.conn.on('close', () => {
      this.onStatusChange('disconnected');
    });

    this.conn.on('error', (err) => {
      reject(err);
    });
  }

  send(event, payload = {}) {
    if (this.conn && this.conn.open) {
      this.conn.send({ event, payload });
    }
  }

  async calibrateClock(iterations = 6) {
    const samples = [];
    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now() + performance.timeOrigin;
      await new Promise(res => {
        const handler = (data) => {
          if (data && data.event === 'server:time:sync_response') {
            const t3 = performance.now() + performance.timeOrigin;
            const { t1, t2 } = data.payload;
            const rtt = (t3 - t0) - (t2 - t1);
            const offset = ((t1 - t0) + (t2 - t3)) / 2;
            samples.push({ rtt, offset });
            res();
          }
        };
        this.conn.on('data', handler);
        this.send('client:time:sync_request', { t0 });
        setTimeout(res, 120);
      });
    }

    if (samples.length > 0) {
      samples.sort((a, b) => a.rtt - b.rtt);
      this.serverTimeOffset = samples[Math.floor(samples.length / 2)].offset;
    }
  }

  toClientTime(serverTimestampMs) {
    return serverTimestampMs - this.serverTimeOffset;
  }

  async sendAudioTrack(blob, mimeType, durationMs) {
    const arrayBuffer = await blob.arrayBuffer();
    this.send('client:game:audio_data', {
      audioArrayBuffer: arrayBuffer,
      mimeType,
      durationMs
    });
  }

  dispose() {
    if (this.peer) this.peer.destroy();
  }
}

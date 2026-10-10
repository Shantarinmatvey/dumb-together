/**
 * p2p-network.js
 * Реализует серверлесс P2P-сеть для игры «Dumb Together» поверх WebRTC (PeerJS).
 * Позволяет создавать комнаты и играть через интернет без выделенного сервера.
 */

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
 * Менеджер сетевой сессии на стороне ХОСТА (Главного экрана)
 */
export class HostP2PManager {
  constructor(roomCode, options = {}) {
    this.roomCode = roomCode.toUpperCase();
    this.peerId = `dt-${this.roomCode}`;
    this.peer = null;
    this.connections = new Map(); // connId -> DataConnection
    this.players = new Map(); // connId -> Player Object
    this.listeners = new Map();
    this.stage = 'LOBBY';
    this.currentClip = null;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onReaction = options.onReaction || (() => {});
    this.onCodeTaken = options.onCodeTaken || (() => {});
    this.onAllAudioReady = options.onAllAudioReady || (() => {});
  }

  init() {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      this.peer = new window.Peer(this.peerId, PEER_CONFIG);

      this.peer.on('open', (id) => {
        console.log(`[HostP2P] Хост успешно зарегистрирован в сети с PeerID: ${id}`);
        this.onStatusChange('connected');
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
      console.log(`[HostP2P] Новое входящее подключение: ${conn.peer}`);
      this.connections.set(conn.peer, conn);
    });

    conn.on('data', (data) => {
      this.handleClientMessage(conn, data);
    });

    conn.on('close', () => {
      console.log(`[HostP2P] Отключение игрока: ${conn.peer}`);
      this.connections.delete(conn.peer);
      this.players.delete(conn.peer);
      this.broadcastRoomState();
    });
  }

  handleClientMessage(conn, msg) {
    if (!msg || !msg.event) return;
    const { event, payload } = msg;

    // 1. NTP-калибровка времени относительно Хоста
    if (event === 'client:time:sync_request') {
      const now = performance.now() + performance.timeOrigin;
      conn.send({
        event: 'server:time:sync_response',
        payload: {
          t0: payload.t0,
          t1: now,
          t2: now
        }
      });
      return;
    }

    // 2. Вход игрока в комнату
    if (event === 'client:room:join') {
      const player = {
        playerId: conn.peer,
        nickname: payload.nickname || 'Геймер',
        avatarId: payload.avatarId || '🦊',
        isHost: false,
        micReady: false,
        assignedRoleId: null,
        hasAudio: false,
        audioArrayBuffer: null,
        mimeType: 'audio/webm',
        leadInOffsetMs: 0,
        score: 0,
        votes: 0
      };
      this.players.set(conn.peer, player);

      conn.send({
        event: 'server:room:joined',
        payload: {
          playerId: player.playerId,
          currentStage: this.stage
        }
      });

      this.broadcastRoomState();
      return;
    }

    // 3. Готовность микрофона
    if (event === 'client:player:mic_ready') {
      const player = this.players.get(conn.peer);
      if (player) {
        player.micReady = true;
        this.broadcastRoomState();
      }
      return;
    }

    // 4. Получение аудиодорожки напрямую по WebRTC DataChannel
    if (event === 'client:game:audio_data') {
      const player = this.players.get(conn.peer);
      if (player) {
        player.hasAudio = true;
        player.audioArrayBuffer = payload.audioArrayBuffer;
        player.mimeType = payload.mimeType;
        player.leadInOffsetMs = payload.leadInOffsetMs || 0;
        player.durationMs = payload.durationMs || 0;
        console.log(`[HostP2P] Получена аудиодорожка от ${player.nickname} (${player.audioArrayBuffer.byteLength} байт)`);
        this.broadcastRoomState();

        // Проверяем, все ли игроки с ролями прислали аудио
        const activeWithRoles = Array.from(this.players.values()).filter(p => p.assignedRoleId);
        if (activeWithRoles.length > 0 && activeWithRoles.every(p => p.hasAudio)) {
          this.onAllAudioReady();
        }
      }
      return;
    }

    // 5. Летающие реакции
    if (event === 'client:game:reaction') {
      this.onReaction(payload.emoji);
      this.broadcast('server:game:reaction', { emoji: payload.emoji });
      return;
    }

    // 6. Голосование зрителей
    if (event === 'client:game:vote') {
      const target = this.players.get(payload.targetPlayerId);
      if (target) {
        target.votes += 1;
        this.broadcastRoomState();
      }
      return;
    }
  }

  broadcast(event, payload) {
    const msg = { event, payload };
    this.connections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(msg);
        } catch (e) {
          console.warn('[HostP2P] Ошибка отправки пакета:', e);
        }
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
      assignedRoleId: p.assignedRoleId,
      hasAudio: p.hasAudio,
      score: p.score,
      votes: p.votes
    }));

    const statePayload = {
      roomCode: this.roomCode,
      stage: this.stage,
      players: playersList
    };

    this.broadcast('server:room:state_update', statePayload);
    if (this.onStateUpdate) {
      this.onStateUpdate(statePayload);
    }
  }

  startPreview(clip) {
    this.stage = 'PREVIEW';
    this.currentClip = clip;
    const playersList = Array.from(this.players.values());

    // Распределяем роли
    const roles = clip.roles;
    playersList.forEach((player, idx) => {
      const assigned = roles[idx % roles.length];
      player.assignedRoleId = assigned.role_id || assigned.roleId;
      player.hasAudio = false;
      player.audioArrayBuffer = null;
      player.votes = 0;

      const conn = this.connections.get(player.playerId);
      if (conn && conn.open) {
        conn.send({
          event: 'server:game:role_assign',
          payload: {
            clip,
            role: assigned
          }
        });
      }
    });

    this.broadcastRoomState();
  }

  startRecording(countdownMs = 3000, durationMs = 8000) {
    this.stage = 'RECORDING';
    const nowHost = performance.now() + performance.timeOrigin;
    const startAtHost = nowHost + countdownMs;

    this.broadcast('server:game:start_recording', {
      startAtServerTimestamp: startAtHost,
      durationMs,
      countdownMs
    });

    this.broadcastRoomState();
    return { startAtHost, durationMs };
  }

  startPlayback(delayMs = 1200) {
    this.stage = 'PLAYBACK';
    const nowHost = performance.now() + performance.timeOrigin;
    const startAtHost = nowHost + delayMs;

    const tracks = Array.from(this.players.values())
      .filter(p => p.hasAudio && p.audioArrayBuffer)
      .map(p => ({
        playerId: p.playerId,
        nickname: p.nickname,
        avatarId: p.avatarId,
        audioArrayBuffer: p.audioArrayBuffer,
        leadInOffsetMs: p.leadInOffsetMs,
        roleId: p.assignedRoleId
      }));

    this.broadcast('server:game:playback_start', {
      playbackStartAtServerTimestamp: startAtHost,
      clip: this.currentClip,
      tracks: tracks.map(t => ({
        playerId: t.playerId,
        nickname: t.nickname,
        avatarId: t.avatarId,
        roleId: t.roleId
      }))
    });

    this.broadcastRoomState();
    return { startAtHost, tracks };
  }

  calculateResults() {
    this.stage = 'RESULTS';
    const leaderboard = Array.from(this.players.values())
      .filter(p => p.assignedRoleId)
      .map(p => {
        p.score = (p.votes * 250) + 500 + Math.floor(Math.random() * 300);
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
    this.players.forEach(p => {
      p.assignedRoleId = null;
      p.hasAudio = false;
      p.audioArrayBuffer = null;
      p.votes = 0;
    });
    this.broadcast('server:room:state_update', {
      roomCode: this.roomCode,
      stage: 'LOBBY',
      players: Array.from(this.players.values())
    });
  }

  dispose() {
    if (this.peer) this.peer.destroy();
  }
}

/**
 * Менеджер сетевой сессии на стороне СМАРТФОНА (Контроллера игрока)
 */
export class ClientP2PManager {
  constructor(roomCode, nickname, avatarId) {
    this.roomCode = roomCode.toUpperCase();
    this.nickname = nickname;
    this.avatarId = avatarId;
    this.peer = null;
    this.conn = null;
    this.serverTimeOffset = 0;
    this.isCalibrated = false;
    this.handlers = new Map();
    this.onStatusChange = () => {};
  }

  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
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

      this.peer.on('open', (id) => {
        console.log(`[ClientP2P] Клиент инициализирован с PeerID: ${id}`);
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
      console.log(`[ClientP2P] Соединение с Хостом ${hostPeerId} установлено!`);
      this.onStatusChange('connected');

      // Калибруем часы с Хостом
      await this.calibrateClock(6);

      // Входим в комнату
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
      console.warn('[ClientP2P] Соединение с Хостом разорвано');
      this.onStatusChange('disconnected');
    });

    this.conn.on('error', (err) => {
      console.error('[ClientP2P] Ошибка канала данных:', err);
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
            this.conn.off?.('data', handler);
            res();
          }
        };
        this.conn.on('data', handler);
        this.send('client:time:sync_request', { t0 });
        setTimeout(res, 150);
      });
    }

    if (samples.length > 0) {
      samples.sort((a, b) => a.rtt - b.rtt);
      this.serverTimeOffset = samples[Math.floor(samples.length / 2)].offset;
      this.isCalibrated = true;
      console.log(`[ClientP2P] Часы синхронизированы с Хостом. Offset: ${this.serverTimeOffset.toFixed(2)} ms`);
    }
  }

  toClientTime(serverTimestampMs) {
    return serverTimestampMs - this.serverTimeOffset;
  }

  async sendAudioTrack(blob, mimeType, leadInOffsetMs, durationMs) {
    const arrayBuffer = await blob.arrayBuffer();
    this.send('client:game:audio_data', {
      audioArrayBuffer: arrayBuffer,
      mimeType,
      leadInOffsetMs,
      durationMs
    });
  }

  dispose() {
    if (this.peer) this.peer.destroy();
  }
}

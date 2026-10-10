/**
 * HostMultitrackMixer
 * Синхронный многоканальный Web Audio API плеер для главного экрана (Хоста).
 * Загружает, декодирует и одновременно воспроизводит дорожки всех игроков,
 * визуализируя персональные осциллограммы (Waveforms) на Canvas.
 */
export class HostMultitrackMixer {
  constructor() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass();
    this.tracks = new Map(); // playerId -> { buffer, source, analyser, dataArray, volumeNode }
    this.isPlaying = false;
    this.animId = null;
  }

  async ensureAudioUnlocked() {
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  /**
   * Предварительная загрузка и декодирование аудиодорожки игрока
   */
  async loadTrack(playerId, audioUrl) {
    await this.ensureAudioUnlocked();
    try {
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const volumeNode = this.audioCtx.createGain();
      volumeNode.gain.value = 1.0;

      volumeNode.connect(analyser);
      analyser.connect(this.audioCtx.destination);

      this.tracks.set(playerId, {
        audioBuffer,
        analyser,
        dataArray,
        volumeNode,
        source: null
      });

      console.log(`[HostMixer] Дорожка игрока ${playerId} успешно декодирована (${audioBuffer.duration.toFixed(2)}s)`);
      return true;
    } catch (e) {
      console.error(`[HostMixer] Ошибка загрузки дорожки ${playerId}:`, e);
      return false;
    }
  }

  /**
   * Синхронный старт воспроизведения всех дорожек по запланированному времени
   */
  playAllScheduled(targetAudioContextTime = 0) {
    this.stopAll();
    const startTime = targetAudioContextTime > 0
      ? targetAudioContextTime
      : this.audioCtx.currentTime + 0.05;

    this.tracks.forEach((trackData, playerId) => {
      if (!trackData.audioBuffer) return;

      const source = this.audioCtx.createBufferSource();
      source.buffer = trackData.audioBuffer;
      source.connect(trackData.volumeNode);
      source.start(startTime);
      trackData.source = source;
    });

    this.isPlaying = true;
  }

  stopAll() {
    this.tracks.forEach((trackData) => {
      if (trackData.source) {
        try {
          trackData.source.stop();
          trackData.source.disconnect();
        } catch (e) {
          // ignore
        }
        trackData.source = null;
      }
    });
    this.isPlaying = false;
  }

  /**
   * Визуализация частотных полос/волн для всех игроков
   */
  renderWaveforms(canvas, playersList) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      if (!playersList || playersList.length === 0) {
        if (this.isPlaying) this.animId = requestAnimationFrame(draw);
        return;
      }

      const colWidth = w / playersList.length;

      playersList.forEach((player, idx) => {
        const track = this.tracks.get(player.playerId);
        const colX = idx * colWidth;

        // Фон колонки игрока
        ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
        ctx.fillRect(colX + 4, 4, colWidth - 8, h - 8);

        // Имя и аватар игрока
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${player.avatarId || '🎙️'} ${player.nickname}`, colX + colWidth / 2, 24);

        if (track && track.analyser) {
          track.analyser.getByteFrequencyData(track.dataArray);
          const bins = track.dataArray.length;
          const barWidth = (colWidth - 24) / (bins / 2);

          for (let b = 0; b < bins / 2; b++) {
            const val = track.dataArray[b]; // 0..255
            const barH = (val / 255) * (h - 45);
            const bx = colX + 12 + b * barWidth;
            const by = h - 10 - barH;

            // Неоновый градиент эквалайзера
            ctx.fillStyle = val > 180 ? '#EF4444' : val > 100 ? '#F59E0B' : '#10B981';
            ctx.fillRect(bx, by, barWidth - 1, barH);
          }
        } else {
          // Если дорожка еще не играет или загружается
          ctx.fillStyle = '#64748B';
          ctx.font = '12px sans-serif';
          ctx.fillText('Ожидание аудио...', colX + colWidth / 2, h / 2);
        }
      });

      if (this.isPlaying) {
        this.animId = requestAnimationFrame(draw);
      }
    };

    if (this.animId) cancelAnimationFrame(this.animId);
    draw();
  }

  stopWaveforms() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  dispose() {
    this.stopAll();
    this.stopWaveforms();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
  }
}

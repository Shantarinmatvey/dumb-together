/**
 * BrowserAudioEngine
 * Управляет микрофоном, разблокировкой звука в iOS Safari,
 * индикатором VU-метра и записью аудио через MediaRecorder API.
 */
export class BrowserAudioEngine {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.analyser = null;
    this.animFrameId = null;
    this.recordedChunks = [];
    this.selectedMimeType = '';
  }

  /**
   * Разблокировка WebKit AudioContext по тапу пользователя (iOS Safari requirement)
   */
  async unlockAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!this.audioContext) {
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Воспроизводим 1 семпл тишины для окончательного снятия мьюта
    const buffer = this.audioContext.createBuffer(1, 1, 22050);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start(0);
    console.log('[AudioEngine] AudioContext разблокирован, state:', this.audioContext.state);
  }

  /**
   * Выбор поддерживаемого формата записи (Opus WebM для Chrome/Firefox, MP4/AAC для Safari)
   */
  resolveMimeType() {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
      'audio/aac'
    ];
    for (const mime of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return '';
  }

  /**
   * Инициализация микрофона и VU-метра
   * @param {function(number): void} onVolumeChange Callback уровня громкости от 0 до 100
   */
  async initMicrophone(onVolumeChange = null) {
    await this.unlockAudio();

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000
      },
      video: false
    });

    this.selectedMimeType = this.resolveMimeType();
    console.log('[AudioEngine] Выбранный MIME тип:', this.selectedMimeType || 'браузерный по умолчанию');

    if (onVolumeChange) {
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      const updateMeter = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const volumePercent = Math.min(100, Math.round((avg / 128) * 100));
        onVolumeChange(volumePercent);
        this.animFrameId = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    }

    return this.mediaStream;
  }

  /**
   * Синхронная запись аудиодорожки по целевому таймстемпу клиента
   */
  async recordScheduled(targetClientTimestampMs, durationMs) {
    if (!this.mediaStream) {
      throw new Error('Микрофон не инициализирован!');
    }

    this.recordedChunks = [];
    const options = this.selectedMimeType ? { mimeType: this.selectedMimeType } : {};
    this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    // Ожидаем наступления расчетного времени старта
    const now = performance.now() + performance.timeOrigin;
    const waitDelay = Math.max(0, targetClientTimestampMs - now);

    if (waitDelay > 0) {
      await new Promise((r) => setTimeout(r, waitDelay));
    }

    const actualStartTime = performance.now() + performance.timeOrigin;
    const actualStartDelayMs = Math.round(actualStartTime - targetClientTimestampMs);
    console.log(`[AudioEngine] Запись начата. Задержка старта аппаратуры: ${actualStartDelayMs} ms`);

    this.mediaRecorder.start(100);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, {
              type: this.selectedMimeType || 'audio/webm'
            });
            console.log(`[AudioEngine] Запись завершена. Размер блоба: ${blob.size} байт`);
            resolve({
              blob,
              mimeType: this.selectedMimeType || 'audio/webm',
              actualStartDelayMs
            });
          };
          this.mediaRecorder.stop();
        } else {
          reject(new Error('MediaRecorder был остановлен преждевременно'));
        }
      }, durationMs);
    });
  }

  /**
   * Отправка аудио-блоба на сервер
   */
  async uploadAudio(blob, roomCode, playerId) {
    const formData = new FormData();
    const ext = this.selectedMimeType.includes('mp4') ? '.mp4' : '.webm';
    formData.append('file', blob, `rec_${playerId}${ext}`);
    formData.append('roomCode', roomCode);
    formData.append('playerId', playerId);

    const response = await fetch('/api/upload-audio', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Ошибка загрузки аудио: ${response.statusText}`);
    }

    const data = await response.json();
    return data.audioUrl;
  }

  stopVolumeMeter() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  dispose() {
    this.stopVolumeMeter();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

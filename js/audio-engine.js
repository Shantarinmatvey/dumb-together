/**
 * audio-engine.js
 * Управляет микрофоном, анимацией уровня децибел (диктофон),
 * записью фрагмента и локальным предпрослушиванием (повтором записи).
 */

export class BrowserAudioEngine {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.analyser = null;
    this.visAnimId = null;
    this.recordedChunks = [];
    this.selectedMimeType = '';
    this.lastRecordedBlob = null;
    this.lastAudioUrl = null;
    this.previewAudioElement = null;
  }

  async unlockAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!this.audioContext) {
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const buffer = this.audioContext.createBuffer(1, 1, 22050);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start(0);
  }

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

  async initMicrophone() {
    await this.unlockAudio();

    // 1. Максимально совместимый запрос к микрофону
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const legacyGetUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
      if (legacyGetUserMedia) {
        this.mediaStream = await new Promise((resolve, reject) => {
          legacyGetUserMedia.call(navigator, { audio: true }, resolve, reject);
        });
      } else {
        throw new Error('Ваш браузер не поддерживает доступ к микрофону (navigator.mediaDevices недоступен). Используйте современный Chrome, Edge или Safari.');
      }
    } else {
      try {
        // Пробуем стандартные фильтры без жестких ограничений sampleRate/channelCount
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
      } catch (err1) {
        console.warn('getUserMedia с расширенными фильтрами не удался, пробуем базовый audio: true', err1);
        try {
          this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err2) {
          throw err2;
        }
      }
    }

    this.selectedMimeType = this.resolveMimeType();

    // Создаем AnalyserNode для анимации диктофона
    if (this.audioContext && this.mediaStream) {
      try {
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);
      } catch (e) {
        console.warn('Ошибка привязки AnalyserNode:', e);
      }
    }

    return this.mediaStream;
  }

  /**
   * Инициализация виртуального (тестового) микрофона для ПК без гарнитуры или тестирования
   */
  initMockMicrophone() {
    this.unlockAudio();
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }

    const dest = this.audioContext.createMediaStreamDestination();
    // Генерируем тихий фоновый шум/осциллятор, чтобы диктофон реагировал
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, this.audioContext.currentTime);
    gain.gain.setValueAtTime(0.005, this.audioContext.currentTime);
    osc.connect(gain);
    gain.connect(dest);
    osc.start();

    this.mediaStream = dest.stream;
    this.selectedMimeType = this.resolveMimeType();

    try {
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);
    } catch (e) {
      console.warn('Mock analyser error:', e);
    }

    return this.mediaStream;
  }

  /**
   * Запуск анимации изменения децибел диктофона на Canvas
   * @param {HTMLCanvasElement} canvas
   * @param {function(number): void} onVolumeChange Callback уровня громкости (0..100)
   */
  startDecibelVisualizer(canvas, onVolumeChange = null) {
    if (!this.analyser || !canvas) return;

    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      this.analyser.getByteFrequencyData(dataArray);

      // Корректируем разрешение canvas под его фактический размер
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Фон диктофона
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, w, h);

      // Сетка/линии уровня
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(w, h * 0.5);
      ctx.stroke();

      // Столбики диктофона
      const barCount = 28;
      const barWidth = (w - (barCount * 4)) / barCount;
      let totalVolume = 0;

      for (let i = 0; i < barCount; i++) {
        // Берем сэмплы из частотного диапазона голоса
        const dataIdx = Math.floor((i / barCount) * (bufferLength * 0.75));
        const val = dataArray[dataIdx] || 0; // 0..255
        totalVolume += val;

        const normalizedHeight = Math.max(6, (val / 255) * (h - 16));
        const x = 4 + i * (barWidth + 4);
        const y = (h - normalizedHeight) / 2;

        // Неоновый цвет по уровню децибел: зеленый -> желтый -> красный
        if (val > 180) {
          ctx.fillStyle = '#EF4444'; // Перегруз / пик
        } else if (val > 90) {
          ctx.fillStyle = '#F59E0B'; // Средний уровень
        } else {
          ctx.fillStyle = '#10B981'; // Норма
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, normalizedHeight, 3);
        ctx.fill();
      }

      const avgVolume = Math.min(100, Math.round((totalVolume / (barCount * 128)) * 100));
      if (onVolumeChange) {
        onVolumeChange(avgVolume);
      }

      ctx.restore();
      this.visAnimId = requestAnimationFrame(render);
    };

    if (this.visAnimId) cancelAnimationFrame(this.visAnimId);
    render();
  }

  stopDecibelVisualizer() {
    if (this.visAnimId) {
      cancelAnimationFrame(this.visAnimId);
      this.visAnimId = null;
    }
  }

  /**
   * Синхронная запись аудиодорожки
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

    const now = performance.now() + performance.timeOrigin;
    const waitDelay = Math.max(0, targetClientTimestampMs - now);
    if (waitDelay > 0) {
      await new Promise((r) => setTimeout(r, waitDelay));
    }

    const actualStartTime = performance.now() + performance.timeOrigin;
    const actualStartDelayMs = Math.round(actualStartTime - targetClientTimestampMs);
    this.mediaRecorder.start(100);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, {
              type: this.selectedMimeType || 'audio/webm'
            });

            this.lastRecordedBlob = blob;
            if (this.lastAudioUrl) URL.revokeObjectURL(this.lastAudioUrl);
            this.lastAudioUrl = URL.createObjectURL(blob);

            resolve({
              blob,
              audioUrl: this.lastAudioUrl,
              mimeType: this.selectedMimeType || 'audio/webm',
              actualStartDelayMs
            });
          };
          this.mediaRecorder.stop();
        } else {
          reject(new Error('MediaRecorder был остановлен'));
        }
      }, durationMs);
    });
  }

  /**
   * Локальный повтор записи (прослушать свой записанный голос)
   */
  playLocalPreview() {
    if (!this.lastAudioUrl) return;

    if (this.previewAudioElement) {
      this.previewAudioElement.pause();
    }
    this.previewAudioElement = new Audio(this.lastAudioUrl);
    this.previewAudioElement.play().catch(e => console.warn('Preview play error:', e));
  }

  stopLocalPreview() {
    if (this.previewAudioElement) {
      this.previewAudioElement.pause();
      this.previewAudioElement = null;
    }
  }

  dispose() {
    this.stopDecibelVisualizer();
    this.stopLocalPreview();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

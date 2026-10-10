/**
 * ClockSynchronizer
 * Реализует синхронизацию часов клиента и сервера (Cristian's Algorithm)
 * поверх WebSocket для устранения сетевых задержек при синхронной записи.
 */
export class ClockSynchronizer {
  constructor(socket) {
    this.socket = socket;
    this.serverTimeOffset = 0;
    this.isCalibrated = false;
    this.pingSamples = [];
  }

  /**
   * Запускает калибровочную серию запросов (8-10 итераций)
   */
  async calibrate(iterations = 8) {
    this.pingSamples = [];

    for (let i = 0; i < iterations; i++) {
      await this.sendSyncPing();
      await new Promise((r) => setTimeout(r, 120));
    }

    if (this.pingSamples.length === 0) {
      console.warn('Синхронизация не получила ответов, offset = 0');
      this.serverTimeOffset = 0;
      this.isCalibrated = true;
      return 0;
    }

    // Сортируем по RTT для фильтрации выбросов
    this.pingSamples.sort((a, b) => a.rtt - b.rtt);
    // Берем 70% лучших замеров с минимальным RTT
    const valid = this.pingSamples.slice(
      0,
      Math.max(1, Math.floor(this.pingSamples.length * 0.7))
    );

    const mid = Math.floor(valid.length / 2);
    this.serverTimeOffset =
      valid.length % 2 !== 0
        ? valid[mid].offset
        : (valid[mid - 1].offset + valid[mid].offset) / 2;

    this.isCalibrated = true;
    console.log(`[ClockSync] Калибровка завершена. Offset: ${this.serverTimeOffset.toFixed(2)} ms (RTT min: ${valid[0].rtt.toFixed(2)} ms)`);
    return this.serverTimeOffset;
  }

  sendSyncPing() {
    return new Promise((resolve) => {
      const t0 = performance.now() + performance.timeOrigin;

      const onMessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'server:time:sync_response' && Math.abs(msg.payload.t0 - t0) < 5) {
            const t3 = performance.now() + performance.timeOrigin;
            const { t1, t2 } = msg.payload;

            const rtt = (t3 - t0) - (t2 - t1);
            const offset = ((t1 - t0) + (t2 - t3)) / 2;

            this.pingSamples.push({ rtt, offset });
            this.socket.removeEventListener('message', onMessage);
            resolve();
          }
        } catch (e) {
          // ignore
        }
      };

      this.socket.addEventListener('message', onMessage);

      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          event: 'client:time:sync_request',
          payload: { t0 }
        }));
      } else {
        resolve();
      }
    });
  }

  /**
   * Возвращает текущее расчетное серверное время в мс
   */
  getServerNow() {
    return performance.now() + performance.timeOrigin + this.serverTimeOffset;
  }

  /**
   * Переводит серверный таймстемп в локальное время клиента
   */
  toClientTime(serverTimestampMs) {
    return serverTimestampMs - this.serverTimeOffset;
  }
}

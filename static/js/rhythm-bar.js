/**
 * RhythmBarRenderer
 * Интерактивный ритм-таймлайн (Guitar Hero style) для мобильного контроллера.
 * Визуализирует приближающиеся маркеры реплик и звуковых эффектов.
 */
export class RhythmBarRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cues = [];
    this.durationMs = 8000;
    this.animId = null;
    this.hasVibrated = {};
  }

  setCues(cues, durationMs) {
    this.cues = cues || [];
    this.durationMs = durationMs || 8000;
    this.hasVibrated = {};
  }

  start(getTimeCallback) {
    const render = () => {
      const elapsed = getTimeCallback();
      this.draw(elapsed);
      this.animId = requestAnimationFrame(render);
    };
    render();
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  draw(elapsedMs) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    // Фоновая подложка
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, w, h);

    // Дорожка
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Линия считывания (Hit Zone) — по центру (X = w * 0.3)
    const hitX = w * 0.3;
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(hitX, 0);
    ctx.lineTo(hitX, h);
    ctx.stroke();

    // Зона попадания (подсветка)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(hitX - 25, 0, 50, h);

    // Масштаб: 1 секунда = 140 пикселей
    const pxPerMs = 0.14;

    let activeCueInHitZone = null;

    // Рендерим плашки с подсказками
    for (const cue of this.cues) {
      const startX = hitX + (cue.startMs - elapsedMs) * pxPerMs;
      const endX = hitX + (cue.endMs - elapsedMs) * pxPerMs;
      const blockWidth = Math.max(70, endX - startX);

      // Проверяем, находится ли плашка в поле зрения
      if (endX < 0 || startX > w) continue;

      const inZone = elapsedMs >= cue.startMs && elapsedMs <= cue.endMs;
      if (inZone) {
        activeCueInHitZone = cue;
        // Тактильный отклик при входе в зону
        if (!this.hasVibrated[cue.cueId] && navigator.vibrate) {
          navigator.vibrate([25, 30, 25]);
          this.hasVibrated[cue.cueId] = true;
        }
      }

      // Цвет плашки
      ctx.fillStyle = inZone ? '#F59E0B' : '#6366F1';
      ctx.strokeStyle = inZone ? '#FDE68A' : '#A5B4FC';
      ctx.lineWidth = 2;

      // Скругленный прямоугольник плашки
      const blockY = 12;
      const blockH = h - 24;
      ctx.beginPath();
      ctx.roundRect(startX, blockY, blockWidth, blockH, 8);
      ctx.fill();
      ctx.stroke();

      // Текст подсказки внутри блока
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const textX = Math.max(startX + 10, 10);
      ctx.fillText(cue.textPrompt, textX, h * 0.5);
    }

    // Текст статуса в левом верхнем углу
    ctx.font = '12px sans-serif';
    ctx.fillStyle = activeCueInHitZone ? '#10B981' : '#94A3B8';
    ctx.textAlign = 'left';
    ctx.fillText(
      activeCueInHitZone ? '🔥 СЕЙЧАС! ДЕЛАЙ ЗВУК!' : 'Ожидание тайминга...',
      14,
      18
    );
  }
}

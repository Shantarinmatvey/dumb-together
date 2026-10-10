/**
 * clips-data.js
 * Сценарии клипов с четким разделением на последовательные фрагменты (тайм-слоты)
 * для каждого участника, и процедурный аниматор сцен на Canvas.
 */

export const CLIPS_METADATA = [
  {
    clipId: 'clip_heist',
    title: 'Ограбление века: Прокол с сигнализацией',
    totalDurationMs: 12000,
    description: 'Грабитель крадется к сейфу, роняет вазу на кота, и весь музей оглашает сирена!',
    fragments: [
      {
        fragmentId: 'f1',
        title: 'Фрагмент 1: Крадущийся грабитель',
        characterName: 'Грабитель-профи',
        avatar: '🥷',
        color: '#3B82F6',
        startMs: 0,
        endMs: 4000,
        textPrompt: '«Так... тихо крадемся... Черт, где код от сейфа?!»'
      },
      {
        fragmentId: 'f2',
        title: 'Фрагмент 2: Падающая ваза и кот',
        characterName: 'Ваза и испуганный кот',
        avatar: '🙀',
        color: '#F97316',
        startMs: 4000,
        endMs: 8000,
        textPrompt: '«Ой-ой-ой, ваза летит! БАБАХ! МЯЯЯЯЯУ-Ш-Ш-Ш!»'
      },
      {
        fragmentId: 'f3',
        title: 'Фрагмент 3: Сигнализация и охрана',
        characterName: 'Сирена музея и охранник',
        avatar: '🚨',
        color: '#EF4444',
        startMs: 8000,
        endMs: 12000,
        textPrompt: '«ВИУ-ВИУ! ТРЕВОГА! СТОЯТЬ, СТРЕЛЯТЬ БУДУ!»'
      },
      {
        fragmentId: 'f4',
        title: 'Фрагмент 4: Побег на вертолете',
        characterName: 'Пилот вертолета',
        avatar: '🚁',
        color: '#10B981',
        startMs: 12000,
        endMs: 16000,
        textPrompt: '«Хватайся за трос! ТР-ТР-ТР-ТР! Улетаем!»'
      }
    ]
  },
  {
    clipId: 'clip_chef',
    title: 'Адская кухня безумного шефа',
    totalDurationMs: 12000,
    description: 'Шеф подбрасывает тесто, его закручивает вентилятор и смачно шлепает в лицо!',
    fragments: [
      {
        fragmentId: 'f1',
        title: 'Фрагмент 1: Итальянский восторг',
        characterName: 'Шеф Марио',
        avatar: '👨‍🍳',
        color: '#16A34A',
        startMs: 0,
        endMs: 4000,
        textPrompt: '«Мамма мия! Какое великолепное тесто! Опа!»'
      },
      {
        fragmentId: 'f2',
        title: 'Фрагмент 2: Вращение в вентиляторе',
        characterName: 'Вентилятор и тесто',
        avatar: '💨',
        color: '#64748B',
        startMs: 4000,
        endMs: 8000,
        textPrompt: '«Вжух-вжух-вжух! Тесто намотало! Оно летит обратно!»'
      },
      {
        fragmentId: 'f3',
        title: 'Фрагмент 3: Шлепок в лицо',
        characterName: 'Шлепок теста в лицо',
        avatar: '🍕',
        color: '#EAB308',
        startMs: 8000,
        endMs: 12000,
        textPrompt: '«Ш-Ш-ШЛЕП! Горячо! Ничего не вижу, спасите!»'
      },
      {
        fragmentId: 'f4',
        title: 'Фрагмент 4: Овации на кухне',
        characterName: 'Помощник шефа',
        avatar: '👏',
        color: '#8B5CF6',
        startMs: 12000,
        endMs: 16000,
        textPrompt: '«Браво, шеф! Это новая подача! Ха-ха-ха!»'
      }
    ]
  },
  {
    clipId: 'clip_station',
    title: 'Драматическое прощание на перроне',
    totalDurationMs: 12000,
    description: 'Паровоз трогается, кондуктор свистит, а романтик бежит с чемоданом...',
    fragments: [
      {
        fragmentId: 'f1',
        title: 'Фрагмент 1: Паровоз отправляется',
        characterName: 'Паровоз и кондуктор',
        avatar: '🚂',
        color: '#0284C7',
        startMs: 0,
        endMs: 4000,
        textPrompt: '«ПШ-Ш-Ш! Поезд отправляется! По вагонам! ФЬЮ-ИТЬ!»'
      },
      {
        fragmentId: 'f2',
        title: 'Фрагмент 2: Крик влюбленного',
        characterName: 'Романтичный герой',
        avatar: '🏃',
        color: '#8B5CF6',
        startMs: 4000,
        endMs: 8000,
        textPrompt: '«НЕ УЕЗЖАЙ, КЛАРА! Я БЕГУ! Я ВСЕ ПРОЩУ!»'
      },
      {
        fragmentId: 'f3',
        title: 'Фрагмент 3: Падение через чемодан',
        characterName: 'Чемодан и падение',
        avatar: '🧳',
        color: '#D97706',
        startMs: 8000,
        endMs: 12000,
        textPrompt: '«БУМ! Ай, мой чемодан! Носом в рельсы... хнык!»'
      },
      {
        fragmentId: 'f4',
        title: 'Фрагмент 4: Пассажиры в вагоне',
        characterName: 'Пассажир поезда',
        avatar: '👀',
        color: '#EC4899',
        startMs: 12000,
        endMs: 16000,
        textPrompt: '«Помаши ему ручкой! До скорого, неудачник!»'
      }
    ]
  }
];

/**
 * Подбирает фрагменты клипа под количество реальных игроков
 */
export function getActiveFragments(clip, playerCount) {
  const count = Math.max(1, playerCount);
  const frags = clip.fragments.slice(0, count);

  // Рассчитываем точные тайминги: каждый игрок получает 4 секунды
  const slotDuration = 4000;
  return frags.map((f, i) => ({
    ...f,
    startMs: i * slotDuration,
    endMs: (i + 1) * slotDuration
  }));
}

/**
 * Процедурный Canvas Аниматор Сцен
 */
export function drawClipAnimation(ctx, width, height, clipId, elapsedMs, totalDurationMs) {
  ctx.clearRect(0, 0, width, height);
  const progress = Math.min(1, Math.max(0, elapsedMs / totalDurationMs));

  if (clipId === 'clip_heist') {
    drawHeistScene(ctx, width, height, elapsedMs, totalDurationMs);
  } else if (clipId === 'clip_chef') {
    drawChefScene(ctx, width, height, elapsedMs, totalDurationMs);
  } else {
    drawStationScene(ctx, width, height, elapsedMs, totalDurationMs);
  }

  // Общий таймлайн внизу сцены
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, height - 14, width, 14);
  ctx.fillStyle = '#10B981';
  ctx.fillRect(0, height - 14, width * progress, 14);
}

function drawHeistScene(ctx, w, h, ms, total) {
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  ctx.fillStyle = '#334155';
  ctx.fillRect(w * 0.7 - 40, h * 0.52, 80, h * 0.22);

  ctx.font = '40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('💎', w * 0.7, h * 0.48);

  // Спящий кот / испуганный
  const catX = w * 0.45;
  const catY = h * 0.72;
  if (ms < 4000) {
    ctx.fillText('😴🐱', catX, catY);
  } else {
    const jumpY = catY - Math.abs(Math.sin((ms - 4000) / 200) * 45);
    ctx.fillText('🙀💥', catX, jumpY);
  }

  // Грабитель
  const thiefX = Math.min(w * 0.35, 70 + (ms / 4000) * (w * 0.3));
  ctx.font = '50px sans-serif';
  if (ms < 4000) {
    ctx.fillText('🥷', thiefX, h * 0.7);
  } else {
    ctx.fillText('😱', thiefX, h * 0.68);
  }

  // Падающая ваза в 4000-6000 ms
  if (ms >= 3500 && ms < 6000) {
    const vaseProg = Math.min(1, (ms - 3500) / 1200);
    const vaseY = h * 0.25 + vaseProg * (h * 0.45);
    ctx.font = '36px sans-serif';
    ctx.fillText('🏺', catX + 15, vaseY);
  }

  // Сирена тревоги после 8000 ms
  if (ms >= 8000) {
    const flash = Math.floor(ms / 250) % 2 === 0;
    ctx.fillStyle = flash ? 'rgba(239, 68, 68, 0.35)' : 'rgba(59, 130, 246, 0.35)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('🚨 ТРЕВОГА! СИРЕНА! 🚨', w * 0.5, h * 0.25);
  }
}

function drawChefScene(ctx, w, h, ms, total) {
  ctx.fillStyle = '#FFFBEB';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#D97706';
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  // Вентилятор
  const fanAngle = (ms / 150) * Math.PI;
  ctx.save();
  ctx.translate(w * 0.5, h * 0.18);
  ctx.rotate(fanAngle);
  ctx.font = '50px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💨', 0, 0);
  ctx.restore();

  // Шеф
  ctx.font = '60px sans-serif';
  ctx.textAlign = 'center';
  if (ms < 8000) {
    ctx.fillText('👨‍🍳', w * 0.5, h * 0.68);
  } else {
    ctx.fillText('😵', w * 0.5, h * 0.68);
    ctx.font = '54px sans-serif';
    ctx.fillText('🍕', w * 0.5, h * 0.64);
  }

  // Тесто
  if (ms >= 1000 && ms < 8000) {
    let doughY = h * 0.55;
    if (ms < 3500) {
      doughY = h * 0.55 - ((ms - 1000) / 2500) * (h * 0.35);
    } else if (ms < 6500) {
      doughY = h * 0.2;
    } else {
      doughY = h * 0.2 + ((ms - 6500) / 1500) * (h * 0.45);
    }
    ctx.font = '40px sans-serif';
    ctx.fillText('🟡', w * 0.5, doughY);
  }
}

function drawStationScene(ctx, w, h, ms, total) {
  ctx.fillStyle = '#38BDF8';
  ctx.fillRect(0, 0, w, h * 0.65);
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(0, h * 0.65, w, h * 0.35);

  // Дым
  ctx.font = '32px sans-serif';
  for (let i = 0; i < 4; i++) {
    const sx = w * 0.22 - (i * 30);
    const sy = h * 0.45 - (i * 20);
    ctx.fillText('💨', sx, sy);
  }

  // Паровоз
  ctx.font = '65px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🚂', w * 0.25, h * 0.63);

  // Кондуктор
  ctx.font = '48px sans-serif';
  ctx.fillText('👮', w * 0.45, h * 0.68);

  // Влюбленный
  const heroProg = Math.min(1, ms / 8000);
  const heroX = w * 0.85 - heroProg * (w * 0.3);
  if (ms < 8000) {
    ctx.fillText('🏃', heroX, h * 0.68);
  } else {
    ctx.fillText('🤕', heroX, h * 0.72);
  }

  // Чемодан
  ctx.font = '40px sans-serif';
  ctx.fillText('🧳', w * 0.6, h * 0.71);
}

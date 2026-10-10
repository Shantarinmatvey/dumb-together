/**
 * clips-data.js
 * Сценарии клипов и процедурный аниматор сцен на HTML5 Canvas
 * для автономного воспроизведения без внешних видеофайлов.
 */

export const CLIPS_METADATA = [
  {
    clipId: 'clip_heist',
    title: 'Ограбление века: Прокол с сигнализацией',
    durationMs: 7500,
    rolesCountRequired: 3,
    description: 'Грабитель крадется к алмазу, но задевает вазу над спящим котом директора...',
    roles: [
      {
        roleId: 'robber_voice',
        name: 'Грабитель-профи',
        color: '#3B82F6',
        avatarPlaceholder: '🥷',
        cues: [
          {
            cueId: 'c1',
            startMs: 500,
            endMs: 1800,
            type: 'SFX_VOICE',
            textPrompt: 'Тяжелое дыхание и шепот: «Почти у цели...»',
            targetPeakMs: 1200
          },
          {
            cueId: 'c2',
            startMs: 4200,
            endMs: 5500,
            type: 'VOICE_SPEECH',
            textPrompt: 'КРИК ПАНИКИ: «НЕ-Е-ЕТ, ТОЛЬКО НЕ КОТ!»',
            targetPeakMs: 4600
          }
        ]
      },
      {
        roleId: 'cat_foley',
        name: 'Спящий кот директора',
        color: '#F97316',
        avatarPlaceholder: '🐱',
        cues: [
          {
            cueId: 'c3',
            startMs: 1000,
            endMs: 3000,
            type: 'SFX_VOICE',
            textPrompt: 'Сладкое мурчание: «Мр-р-р... мр-р-р»',
            targetPeakMs: 2000
          },
          {
            cueId: 'c4',
            startMs: 3600,
            endMs: 5200,
            type: 'SFX_SCREAM',
            textPrompt: 'ИСТОШНЫЙ ВОПЛЬ: «МЯЯЯЯЯУ-Ш-Ш-Ш!»',
            targetPeakMs: 3900
          }
        ]
      },
      {
        roleId: 'alarm_siren',
        name: 'Сигнализация музея',
        color: '#DC2626',
        avatarPlaceholder: '🚨',
        cues: [
          {
            cueId: 'c5',
            startMs: 3400,
            endMs: 3800,
            type: 'SFX_IMPACT',
            textPrompt: 'Звук бьющегося стекла: «ДЗЫНЬ-БАБАХ!»',
            targetPeakMs: 3550
          },
          {
            cueId: 'c6',
            startMs: 5000,
            endMs: 7400,
            type: 'SFX_RHYTHMIC',
            textPrompt: 'Сирена тревоги: «ВИУ-ВИУ-ВИУ-ВИУ!»',
            targetPeakMs: 5300
          }
        ]
      }
    ]
  },
  {
    clipId: 'clip_chef',
    title: 'Адская кухня безумного шефа',
    durationMs: 8000,
    rolesCountRequired: 3,
    description: 'Шеф виртуозно подбрасывает тесто в потолочный вентилятор...',
    roles: [
      {
        roleId: 'italian_chef',
        name: 'Шеф Марио',
        color: '#16A34A',
        avatarPlaceholder: '👨‍🍳',
        cues: [
          {
            cueId: 'c7',
            startMs: 800,
            endMs: 2400,
            type: 'VOICE_SPEECH',
            textPrompt: 'Итальянский восторг: «Опа! Беллиссимо!»',
            targetPeakMs: 1500
          },
          {
            cueId: 'c8',
            startMs: 5600,
            endMs: 7500,
            type: 'SFX_MUFFLED',
            textPrompt: 'Глухо из-под теста: «Мммпф! Мамма мия!»',
            targetPeakMs: 6300
          }
        ]
      },
      {
        roleId: 'kitchen_fan',
        name: 'Потолочный вентилятор',
        color: '#64748B',
        avatarPlaceholder: '💨',
        cues: [
          {
            cueId: 'c9',
            startMs: 2000,
            endMs: 4800,
            type: 'SFX_RHYTHMIC',
            textPrompt: 'Лопасти: «Вжух... вжух... вжух-вжух-вжух»',
            targetPeakMs: 3000
          }
        ]
      },
      {
        roleId: 'pizza_dough',
        name: 'Летающее тесто',
        color: '#EAB308',
        avatarPlaceholder: '🍕',
        cues: [
          {
            cueId: 'c10',
            startMs: 3200,
            endMs: 4500,
            type: 'SFX_VOICE',
            textPrompt: 'Растяжка резины: «И-и-и-у-у-уп!»',
            targetPeakMs: 4100
          },
          {
            cueId: 'c11',
            startMs: 5100,
            endMs: 5700,
            type: 'SFX_IMPACT',
            textPrompt: 'СОЧНЫЙ ШЛЕПОК: «Ш-Ш-ШЛЕП!»',
            targetPeakMs: 5300
          }
        ]
      }
    ]
  },
  {
    clipId: 'clip_station',
    title: 'Драматическое прощание на перроне',
    durationMs: 9000,
    rolesCountRequired: 4,
    description: 'Паровоз трогается, кондуктор свистит, а романтик бежит с чемоданом...',
    roles: [
      {
        roleId: 'romantic_hero',
        name: 'Романтичный герой',
        color: '#8B5CF6',
        avatarPlaceholder: '🏃',
        cues: [
          {
            cueId: 'c12',
            startMs: 2500,
            endMs: 5200,
            type: 'VOICE_DRAMATIC',
            textPrompt: '«НЕ УЕЗЖАЙ, КЛАРА! Я БУДУ ЖДА-А-АТЬ!»',
            targetPeakMs: 4100
          },
          {
            cueId: 'c13',
            startMs: 6800,
            endMs: 8500,
            type: 'VOICE_COMEDY',
            textPrompt: 'Падение носом: «ОЙ, МОЙ НОС... хы-ы-ы»',
            targetPeakMs: 7200
          }
        ]
      },
      {
        roleId: 'steam_locomotive',
        name: 'Паровоз 19-го века',
        color: '#475569',
        avatarPlaceholder: '🚂',
        cues: [
          {
            cueId: 'c14',
            startMs: 500,
            endMs: 4000,
            type: 'SFX_RHYTHMIC',
            textPrompt: 'Пар: «ПШ-Ш-Ш... чух-чух... ПШ-Ш-Ш»',
            targetPeakMs: 1000
          },
          {
            cueId: 'c15',
            startMs: 4500,
            endMs: 6500,
            type: 'SFX_HORN',
            textPrompt: 'Гудок: «ТУ-У-У-У-У-У!»',
            targetPeakMs: 5000
          }
        ]
      },
      {
        roleId: 'conductor',
        name: 'Вредный кондуктор',
        color: '#0284C7',
        avatarPlaceholder: '👮',
        cues: [
          {
            cueId: 'c16',
            startMs: 1500,
            endMs: 2600,
            type: 'SFX_WHISTLE',
            textPrompt: 'Свисток: «ФЬЮ-И-И-И-ИТЬ!»',
            targetPeakMs: 1800
          },
          {
            cueId: 'c17',
            startMs: 3000,
            endMs: 4500,
            type: 'VOICE_SPEECH',
            textPrompt: '«Поезд отправляется, отойдите!»',
            targetPeakMs: 3500
          }
        ]
      },
      {
        roleId: 'leather_suitcase',
        name: 'Чемодан на перроне',
        color: '#78350F',
        avatarPlaceholder: '🧳',
        cues: [
          {
            cueId: 'c18',
            startMs: 5200,
            endMs: 6600,
            type: 'SFX_FOLEY',
            textPrompt: 'Колеса: «Др-р-р-тыгыдык-тыгыдык»',
            targetPeakMs: 6000
          },
          {
            cueId: 'c19',
            startMs: 6700,
            endMs: 7300,
            type: 'SFX_IMPACT',
            textPrompt: 'Удар об ногу: «БУХ!»',
            targetPeakMs: 6900
          }
        ]
      }
    ]
  }
];

/**
 * Процедурный Canvas Аниматор Сцен
 */
export function drawClipAnimation(ctx, width, height, clipId, elapsedMs, durationMs) {
  ctx.clearRect(0, 0, width, height);
  const progress = Math.min(1, Math.max(0, elapsedMs / durationMs));

  if (clipId === 'clip_heist') {
    drawHeistScene(ctx, width, height, elapsedMs, durationMs, progress);
  } else if (clipId === 'clip_chef') {
    drawChefScene(ctx, width, height, elapsedMs, durationMs, progress);
  } else {
    drawStationScene(ctx, width, height, elapsedMs, durationMs, progress);
  }

  // Общий таймлайн бар внизу сцены
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, height - 12, width, 12);
  ctx.fillStyle = '#10B981';
  ctx.fillRect(0, height - 12, width * progress, 12);
}

function drawHeistScene(ctx, w, h, ms, total, p) {
  // Фон музейной комнаты
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, w, h);

  // Колонны и пол
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, h * 0.75, w, h * 0.25);

  // Пьедестал и сияющий алмаз
  ctx.fillStyle = '#334155';
  ctx.fillRect(w * 0.7 - 35, h * 0.55, 70, h * 0.2);

  // Алмаз
  ctx.font = '36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('💎', w * 0.7, h * 0.52);

  // Спящий кот
  ctx.font = '40px sans-serif';
  const catX = w * 0.45;
  const catY = h * 0.75;
  if (ms < 3600) {
    ctx.fillText('😴🐱', catX, catY);
  } else {
    // Вскочил и испугался
    const jumpY = catY - Math.abs(Math.sin((ms - 3600) / 200) * 40);
    ctx.fillText('🙀💥', catX, jumpY);
  }

  // Грабитель крадется слева
  const thiefX = Math.min(w * 0.35, 60 + (ms / 3500) * (w * 0.3));
  ctx.font = '48px sans-serif';
  if (ms < 4200) {
    ctx.fillText('🥷', thiefX, h * 0.73);
  } else {
    ctx.fillText('😱', thiefX, h * 0.71); // паника
  }

  // Падающая ваза на 3400ms
  if (ms >= 2500 && ms < 3600) {
    const vaseProgress = (ms - 2500) / 1000;
    const vaseY = h * 0.3 + vaseProgress * (h * 0.45);
    ctx.font = '32px sans-serif';
    ctx.fillText('🏺', catX + 10, vaseY);
  }

  // Сирена мигает после 5000ms
  if (ms >= 5000) {
    const flash = Math.floor(ms / 250) % 2 === 0;
    ctx.fillStyle = flash ? 'rgba(239, 68, 68, 0.35)' : 'rgba(59, 130, 246, 0.35)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = '44px sans-serif';
    ctx.fillText('🚨 ТРЕВОГА! 🚨', w * 0.5, h * 0.25);
  }
}

function drawChefScene(ctx, w, h, ms, total, p) {
  // Кухня
  ctx.fillStyle = '#FFFBEB';
  ctx.fillRect(0, 0, w, h);

  // Стол
  ctx.fillStyle = '#D97706';
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  // Потолочный вентилятор
  const fanAngle = (ms / 200) * Math.PI;
  ctx.save();
  ctx.translate(w * 0.5, h * 0.18);
  ctx.rotate(fanAngle);
  ctx.font = '46px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💨', 0, 0);
  ctx.restore();

  // Шеф Марио
  ctx.font = '54px sans-serif';
  ctx.textAlign = 'center';
  if (ms < 5100) {
    ctx.fillText('👨‍🍳', w * 0.5, h * 0.68);
  } else {
    // Тесто шлепнулось на лицо
    ctx.fillText('😵', w * 0.5, h * 0.68);
    ctx.font = '50px sans-serif';
    ctx.fillText('🍕', w * 0.5, h * 0.64);
  }

  // Летающее тесто
  if (ms >= 1000 && ms < 5100) {
    let doughY = h * 0.55;
    if (ms < 2500) {
      doughY = h * 0.55 - ((ms - 1000) / 1500) * (h * 0.35); // летит вверх
    } else if (ms < 4000) {
      doughY = h * 0.2; // крутится у вентилятора
    } else {
      doughY = h * 0.2 + ((ms - 4000) / 1100) * (h * 0.44); // падает на шефа
    }
    ctx.font = '38px sans-serif';
    ctx.fillText('🟡', w * 0.5, doughY);
  }
}

function drawStationScene(ctx, w, h, ms, total, p) {
  // Небо и вокзал
  ctx.fillStyle = '#38BDF8';
  ctx.fillRect(0, 0, w, h * 0.65);
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(0, h * 0.65, w, h * 0.35);

  // Дым из трубы поезда
  const smokeCount = Math.floor(ms / 400);
  ctx.font = '30px sans-serif';
  for (let i = 0; i < 4; i++) {
    const sx = w * 0.22 - (i * 30);
    const sy = h * 0.45 - (i * 20);
    ctx.fillText('💨', sx, sy);
  }

  // Паровоз
  ctx.font = '58px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🚂', w * 0.25, h * 0.63);

  // Кондуктор со свистком
  ctx.font = '44px sans-serif';
  ctx.fillText('👮', w * 0.45, h * 0.68);

  // Бегущий влюбленный
  const runProgress = Math.min(1, ms / 7000);
  const heroX = w * 0.85 - runProgress * (w * 0.3);
  if (ms < 6800) {
    ctx.fillText('🏃', heroX, h * 0.68);
  } else {
    // Упал носом в чемодан
    ctx.fillText('🤕', heroX, h * 0.72);
  }

  // Чемодан на перроне
  ctx.font = '36px sans-serif';
  ctx.fillText('🧳', w * 0.6, h * 0.71);
}

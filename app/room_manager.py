import random
import string
import time
import secrets
from typing import Dict, Optional, Tuple, List, Any
from app.models import RoomState, Player, GameStage, Clip, Role, Cue, PeakWindow


def generate_room_code(length: int = 4) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # Без похожих символов 0, O, 1, I
    return "".join(random.choices(alphabet, k=length))


DEFAULT_CLIPS: List[Clip] = [
    Clip(
        clip_id="clip_heist",
        title="Ограбление века: Прокол с сигнализацией",
        duration_ms=7500,
        roles_count_required=3,
        roles=[
          Role(
              role_id="robber_voice",
              name="Грабитель-профи",
              color="#3B82F6",
              avatar_placeholder="🥷",
              cues=[
                  Cue(
                      cue_id="c1",
                      start_ms=500,
                      end_ms=1800,
                      type="SFX_VOICE",
                      text_prompt="Тяжело дыши и шепчи: «Почти готово...»",
                      expected_peak_windows=[PeakWindow(start_ms=1100, end_ms=1400)],
                      scoring_weight=0.4
                  ),
                  Cue(
                      cue_id="c2",
                      start_ms=4200,
                      end_ms=5500,
                      type="VOICE_SPEECH",
                      text_prompt="Крик ужаса: «НЕТ, ТОЛЬКО НЕ КОТ!»",
                      expected_peak_windows=[PeakWindow(start_ms=4400, end_ms=4800)],
                      scoring_weight=0.6
                  )
              ]
          ),
          Role(
              role_id="cat_foley",
              name="Спящий кот директора",
              color="#F97316",
              avatar_placeholder="🐱",
              cues=[
                  Cue(
                      cue_id="c3",
                      start_ms=1000,
                      end_ms=3000,
                      type="SFX_VOICE",
                      text_prompt="Мурчание: «Мр-р-р... мр-р-р»",
                      expected_peak_windows=[PeakWindow(start_ms=1800, end_ms=2200)],
                      scoring_weight=0.3
                  ),
                  Cue(
                      cue_id="c4",
                      start_ms=3600,
                      end_ms=5200,
                      type="SFX_SCREAM",
                      text_prompt="ДИКИЙ ВОПЛЬ: «МЯЯЯЯЯЯУ-Ш-Ш-Ш!»",
                      expected_peak_windows=[PeakWindow(start_ms=3700, end_ms=4100)],
                      scoring_weight=0.7
                  )
              ]
          ),
          Role(
              role_id="alarm_siren",
              name="Сигнализация музея",
              color="#DC2626",
              avatar_placeholder="🚨",
              cues=[
                  Cue(
                      cue_id="c5",
                      start_ms=3400,
                      end_ms=3800,
                      type="SFX_IMPACT",
                      text_prompt="Хруст стекла: «Дзынь-бряк!»",
                      expected_peak_windows=[PeakWindow(start_ms=3450, end_ms=3650)],
                      scoring_weight=0.4
                  ),
                  Cue(
                      cue_id="c6",
                      start_ms=5000,
                      end_ms=7400,
                      type="SFX_RHYTHMIC",
                      text_prompt="Сирена: «ВИУ-ВИУ-ВИУ-ВИУ!»",
                      expected_peak_windows=[
                          PeakWindow(start_ms=5100, end_ms=5400),
                          PeakWindow(start_ms=5800, end_ms=6100),
                          PeakWindow(start_ms=6500, end_ms=6800)
                      ],
                      scoring_weight=0.6
                  )
              ]
          )
        ]
    ),
    Clip(
        clip_id="clip_chef",
        title="Адская кухня безумного шефа",
        duration_ms=8000,
        roles_count_required=3,
        roles=[
            Role(
                role_id="italian_chef",
                name="Шеф Марио",
                color="#16A34A",
                avatar_placeholder="👨‍🍳",
                cues=[
                    Cue(
                        cue_id="c7",
                        start_ms=800,
                        end_ms=2400,
                        type="VOICE_SPEECH",
                        text_prompt="С акцентом: «Опа! Беллиссимо!»",
                        expected_peak_windows=[PeakWindow(start_ms=1400, end_ms=1700)],
                        scoring_weight=0.4
                    ),
                    Cue(
                        cue_id="c8",
                        start_ms=5600,
                        end_ms=7500,
                        type="SFX_MUFFLED",
                        text_prompt="Глухо из-под теста: «Мммпф! Мамма мия!»",
                        expected_peak_windows=[PeakWindow(start_ms=6100, end_ms=6600)],
                        scoring_weight=0.6
                    )
                ]
            ),
            Role(
                role_id="kitchen_fan",
                name="Потолочный вентилятор",
                color="#64748B",
                avatar_placeholder="💨",
                cues=[
                    Cue(
                        cue_id="c9",
                        start_ms=2000,
                        end_ms=4800,
                        type="SFX_RHYTHMIC",
                        text_prompt="Лопасти: «Вжух... вжух... вжух-вжух»",
                        expected_peak_windows=[
                            PeakWindow(start_ms=2200, end_ms=2500),
                            PeakWindow(start_ms=3000, end_ms=3300),
                            PeakWindow(start_ms=3700, end_ms=4000)
                        ],
                        scoring_weight=1.0
                    )
                ]
            ),
            Role(
                role_id="pizza_dough",
                name="Летающее тесто",
                color="#EAB308",
                avatar_placeholder="🍕",
                cues=[
                    Cue(
                        cue_id="c10",
                        start_ms=3200,
                        end_ms=4500,
                        type="SFX_VOICE",
                        text_prompt="Звук резины: «И-и-и-у-у-п!»",
                        expected_peak_windows=[PeakWindow(start_ms=4000, end_ms=4300)],
                        scoring_weight=0.4
                    ),
                    Cue(
                        cue_id="c11",
                        start_ms=5100,
                        end_ms=5700,
                        type="SFX_IMPACT",
                        text_prompt="ШЛЕПОК В ЛИЦО: «Ш-Ш-ШЛЕП!»",
                        expected_peak_windows=[PeakWindow(start_ms=5200, end_ms=5400)],
                        scoring_weight=0.6
                    )
                ]
            )
        ]
    ),
    Clip(
        clip_id="clip_station",
        title="Драматическое прощание на перроне",
        duration_ms=9000,
        roles_count_required=4,
        roles=[
            Role(
                role_id="romantic_hero",
                name="Романтичный герой",
                color="#8B5CF6",
                avatar_placeholder="🏃",
                cues=[
                    Cue(
                        cue_id="c12",
                        start_ms=2500,
                        end_ms=5200,
                        type="VOICE_DRAMATIC",
                        text_prompt="«НЕ УЕЗЖАЙ, КЛАРА! Я БУДУ ЖДА-А-АТЬ!»",
                        expected_peak_windows=[PeakWindow(start_ms=3800, end_ms=4400)],
                        scoring_weight=0.6
                    ),
                    Cue(
                        cue_id="c13",
                        start_ms=6800,
                        end_ms=8500,
                        type="VOICE_COMEDY",
                        text_prompt="Падение носом: «ОЙ, МОЙ НОС... хы-ы-ы»",
                        expected_peak_windows=[PeakWindow(start_ms=7000, end_ms=7400)],
                        scoring_weight=0.4
                    )
                ]
            ),
            Role(
                role_id="steam_locomotive",
                name="Паровоз 19-го века",
                color="#475569",
                avatar_placeholder="🚂",
                cues=[
                    Cue(
                        cue_id="c14",
                        start_ms=500,
                        end_ms=4000,
                        type="SFX_RHYTHMIC",
                        text_prompt="Пар: «ПШ-Ш-Ш... чух-чух... ПШ-Ш-Ш»",
                        expected_peak_windows=[
                            PeakWindow(start_ms=700, end_ms=1100),
                            PeakWindow(start_ms=2100, end_ms=2500)
                        ],
                        scoring_weight=0.5
                    ),
                    Cue(
                        cue_id="c15",
                        start_ms=4500,
                        end_ms=6500,
                        type="SFX_HORN",
                        text_prompt="Гудок поезда: «ТУ-У-У-У-У-У!»",
                        expected_peak_windows=[PeakWindow(start_ms=4700, end_ms=5300)],
                        scoring_weight=0.5
                    )
                ]
            ),
            Role(
                role_id="conductor",
                name="Вредный кондуктор",
                color="#0284C7",
                avatar_placeholder="👮",
                cues=[
                    Cue(
                        cue_id="c16",
                        start_ms=1500,
                        end_ms=2600,
                        type="SFX_WHISTLE",
                        text_prompt="Свисток: «ФЬЮ-И-И-И-ИТЬ!»",
                        expected_peak_windows=[PeakWindow(start_ms=1600, end_ms=2000)],
                        scoring_weight=0.5
                    ),
                    Cue(
                        cue_id="c17",
                        start_ms=3000,
                        end_ms=4500,
                        type="VOICE_SPEECH",
                        text_prompt="«Поезд отправляется, отойдите!»",
                        expected_peak_windows=[PeakWindow(start_ms=3200, end_ms=3800)],
                        scoring_weight=0.5
                    )
                ]
            ),
            Role(
                role_id="leather_suitcase",
                name="Чемодан на перроне",
                color="#78350F",
                avatar_placeholder="🧳",
                cues=[
                    Cue(
                        cue_id="c18",
                        start_ms=5200,
                        end_ms=6600,
                        type="SFX_FOLEY",
                        text_prompt="Колеса: «Др-р-р-тыгыдык-тыгыдык»",
                        expected_peak_windows=[PeakWindow(start_ms=5800, end_ms=6200)],
                        scoring_weight=0.4
                    ),
                    Cue(
                        cue_id="c19",
                        start_ms=6700,
                        end_ms=7300,
                        type="SFX_IMPACT",
                        text_prompt="Глухой удар об ногу: «БУХ!»",
                        expected_peak_windows=[PeakWindow(start_ms=6800, end_ms=7000)],
                        scoring_weight=0.6
                    )
                ]
            )
        ]
    )
]


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, RoomState] = {}
        self.clips: Dict[str, Clip] = {c.clip_id: c for c in DEFAULT_CLIPS}

    def get_room(self, room_code: str) -> Optional[RoomState]:
        return self.rooms.get(room_code.upper())

    def create_room(self, host_nickname: str = "HostScreen", avatar_id: str = "tv") -> Tuple[RoomState, Player]:
        room_code = generate_room_code()
        while room_code in self.rooms:
            room_code = generate_room_code()

        player_id = f"p_{secrets.token_hex(4)}"
        session_token = f"tok_{secrets.token_hex(8)}"

        host_player = Player(
            player_id=player_id,
            session_token=session_token,
            nickname=host_nickname,
            avatar_id=avatar_id,
            is_host=True,
            mic_ready=True
        )

        room = RoomState(
            room_code=room_code,
            host_player_id=player_id,
            stage=GameStage.LOBBY,
            players={player_id: host_player}
        )

        self.rooms[room_code] = room
        return room, host_player

    def join_room(self, room_code: str, nickname: str, avatar_id: str, is_host: bool = False) -> Tuple[RoomState, Player]:
        code = room_code.upper()
        if code not in self.rooms:
            raise ValueError(f"Комната {code} не найдена")

        room = self.rooms[code]
        player_id = f"p_{secrets.token_hex(4)}"
        session_token = f"tok_{secrets.token_hex(8)}"

        player = Player(
            player_id=player_id,
            session_token=session_token,
            nickname=nickname.strip() or f"Игрок-{len(room.players) + 1}",
            avatar_id=avatar_id or "mic",
            is_host=is_host
        )

        room.players[player_id] = player
        return room, player

    def reconnect_player(self, room_code: str, session_token: str) -> Optional[Player]:
        room = self.get_room(room_code)
        if not room:
            return None
        for p in room.players.values():
            if p.session_token == session_token:
                return p
        return None

    def set_player_mic(self, room_code: str, player_id: str, ready: bool) -> bool:
        room = self.get_room(room_code)
        if room and player_id in room.players:
            room.players[player_id].mic_ready = ready
            return True
        return False

    def start_preview(self, room_code: str, clip_id: Optional[str] = None) -> Clip:
        room = self.get_room(room_code)
        if not room:
            raise ValueError("Комната не найдена")

        # Выбираем клип
        if not clip_id or clip_id not in self.clips:
            clip_id = random.choice(list(self.clips.keys()))

        clip = self.clips[clip_id]
        room.current_clip_id = clip_id
        room.stage = GameStage.PREVIEW

        # Распределяем роли игрокам (исключая хост, если игроков достаточно)
        active_players = [p for p in room.players.values() if not p.is_host]
        if not active_players:
            # Если хост играет один (All-in-One режим)
            active_players = list(room.players.values())

        roles_pool = list(clip.roles)
        for i, player in enumerate(active_players):
            assigned_role = roles_pool[i % len(roles_pool)]
            player.assigned_role_id = assigned_role.role_id
            player.audio_url = None
            player.lead_in_offset_ms = 0
            player.score = 0
            player.votes = 0

        return clip

    def schedule_recording(self, room_code: str, countdown_ms: int = 3000) -> Tuple[int, int]:
        room = self.get_room(room_code)
        if not room:
            raise ValueError("Комната не найдена")

        clip = self.clips.get(room.current_clip_id)
        duration_ms = clip.duration_ms if clip else 8000

        # Серверное время старта через countdown_ms
        now_ms = int(time.time() * 1000)
        start_at_ms = now_ms + countdown_ms

        room.stage = GameStage.RECORDING
        room.scheduled_start_timestamp_ms = start_at_ms
        room.scheduled_duration_ms = duration_ms

        return start_at_ms, duration_ms

    def submit_audio(self, room_code: str, player_id: str, audio_url: str, lead_in_offset_ms: int, duration_ms: int):
        room = self.get_room(room_code)
        if not room or player_id not in room.players:
            return

        p = room.players[player_id]
        p.audio_url = audio_url
        p.lead_in_offset_ms = lead_in_offset_ms
        p.audio_duration_ms = duration_ms

    def check_all_audio_uploaded(self, room_code: str) -> bool:
        room = self.get_room(room_code)
        if not room:
            return False

        active_players = [p for p in room.players.values() if p.assigned_role_id is not None]
        if not active_players:
            return False

        return all(p.audio_url is not None for p in active_players)

    def schedule_playback(self, room_code: str, delay_ms: int = 1500) -> int:
        room = self.get_room(room_code)
        if not room:
            raise ValueError("Комната не найдена")

        now_ms = int(time.time() * 1000)
        start_playback_ms = now_ms + delay_ms

        room.stage = GameStage.PLAYBACK
        room.scheduled_playback_timestamp_ms = start_playback_ms
        return start_playback_ms

    def vote(self, room_code: str, target_player_id: str):
        room = self.get_room(room_code)
        if not room or target_player_id not in room.players:
            return
        room.players[target_player_id].votes += 1

    def calculate_results(self, room_code: str) -> Dict[str, Any]:
        room = self.get_room(room_code)
        if not room:
            return {}

        room.stage = GameStage.RESULTS

        # Начисление базовых очков за голосование зрителей и попадание в тайминг
        leaderboard = []
        for p in room.players.values():
            if not p.assigned_role_id and not p.audio_url:
                continue

            # Расчет очков: голоса зрителей * 200 + базовые за участие 500
            total_score = (p.votes * 250) + 500 + random.randint(150, 450)
            p.score = total_score

            leaderboard.append({
                "player_id": p.player_id,
                "nickname": p.nickname,
                "avatar_id": p.avatar_id,
                "votes": p.votes,
                "score": p.score,
                "role_id": p.assigned_role_id
            })

        leaderboard.sort(key=lambda x: x["score"], reverse=True)
        return {"leaderboard": leaderboard}

    def reset_to_lobby(self, room_code: str):
        room = self.get_room(room_code)
        if not room:
            return
        room.stage = GameStage.LOBBY
        room.current_clip_id = None
        room.scheduled_start_timestamp_ms = None
        room.scheduled_duration_ms = None
        room.scheduled_playback_timestamp_ms = None
        for p in room.players.values():
            p.assigned_role_id = None
            p.audio_url = None
            p.votes = 0

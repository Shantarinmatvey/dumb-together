import json
import time
import logging
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
from app.room_manager import RoomManager

logger = logging.getLogger("dumb_together.ws")


class WebSocketConnectionManager:
    def __init__(self, room_manager: RoomManager):
        self.room_manager = room_manager
        # room_code -> set of (WebSocket, player_id)
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # websocket -> (room_code, player_id)
        self.socket_meta: Dict[WebSocket, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, room_code: str):
        await websocket.accept()
        code = room_code.upper()
        if code not in self.active_connections:
            self.active_connections[code] = set()
        self.active_connections[code].add(websocket)
        self.socket_meta[websocket] = {"room_code": code, "player_id": None}

    def disconnect(self, websocket: WebSocket):
        meta = self.socket_meta.get(websocket)
        if meta:
            code = meta["room_code"]
            if code in self.active_connections and websocket in self.active_connections[code]:
                self.active_connections[code].remove(websocket)
                if not self.active_connections[code]:
                    del self.active_connections[code]
            del self.socket_meta[websocket]

    async def send_to_socket(self, websocket: WebSocket, event: str, payload: Any):
        try:
            await websocket.send_text(json.dumps({"event": event, "payload": payload}))
        except Exception as e:
            logger.warning(f"Error sending message to socket: {e}")

    async def broadcast_to_room(self, room_code: str, event: str, payload: Any):
        code = room_code.upper()
        if code not in self.active_connections:
            return

        message = json.dumps({"event": event, "payload": payload})
        dead_sockets = []
        for ws in self.active_connections[code]:
            try:
                await ws.send_text(message)
            except Exception:
                dead_sockets.append(ws)

        for dead in dead_sockets:
            self.disconnect(dead)

    async def broadcast_room_state(self, room_code: str):
        room = self.room_manager.get_room(room_code)
        if not room:
            return

        payload = {
            "roomCode": room.room_code,
            "stage": room.stage.value,
            "hostPlayerId": room.host_player_id,
            "currentClipId": room.current_clip_id,
            "players": [
                {
                    "playerId": p.player_id,
                    "nickname": p.nickname,
                    "avatarId": p.avatar_id,
                    "isHost": p.is_host,
                    "micReady": p.mic_ready,
                    "assignedRoleId": p.assigned_role_id,
                    "hasAudio": p.audio_url is not None,
                    "score": p.score,
                    "votes": p.votes
                }
                for p in room.players.values()
            ]
        }
        await self.broadcast_to_room(room_code, "server:room:state_update", payload)

    async def handle_message(self, websocket: WebSocket, text_data: str):
        try:
            msg = json.loads(text_data)
        except Exception:
            return

        event = msg.get("event")
        payload = msg.get("payload", {})
        meta = self.socket_meta.get(websocket, {})
        room_code = meta.get("room_code")

        # 1. Синхронизация времени (NTP over WebSocket)
        if event == "client:time:sync_request":
            t1 = int(time.time() * 1000)
            t2 = int(time.time() * 1000)
            await self.send_to_socket(websocket, "server:time:sync_response", {
                "t0": payload.get("t0"),
                "t1": t1,
                "t2": t2
            })
            return

        # 2. Подключение игрока / авторизация
        if event == "client:room:join":
            code = payload.get("roomCode", room_code)
            nickname = payload.get("nickname", "Gamer")
            avatar_id = payload.get("avatarId", "mic")
            is_host = payload.get("isHost", False)

            try:
                room, player = self.room_manager.join_room(code, nickname, avatar_id, is_host)
                meta["room_code"] = room.room_code
                meta["player_id"] = player.player_id

                await self.send_to_socket(websocket, "server:room:joined", {
                    "playerId": player.player_id,
                    "sessionToken": player.session_token,
                    "isHost": player.is_host,
                    "currentStage": room.stage.value
                })
                await self.broadcast_room_state(room.room_code)
            except Exception as e:
                await self.send_to_socket(websocket, "server:error", {"message": str(e)})
            return

        # 3. Обновление готовности микрофона
        if event == "client:player:mic_ready":
            player_id = meta.get("player_id")
            ready = payload.get("ready", True)
            if room_code and player_id:
                self.room_manager.set_player_mic(room_code, player_id, ready)
                await self.broadcast_room_state(room_code)
            return

        # 4. Старт предпросмотра и раздача ролей (Хост)
        if event == "client:game:request_start_preview":
            clip_id = payload.get("clipId")
            try:
                clip = self.room_manager.start_preview(room_code, clip_id)
                room = self.room_manager.get_room(room_code)

                # Отправляем каждому игроку его роль
                code = room_code.upper()
                if code in self.active_connections:
                    for ws in self.active_connections[code]:
                        p_meta = self.socket_meta.get(ws, {})
                        pid = p_meta.get("player_id")
                        if pid and pid in room.players:
                            player = room.players[pid]
                            role_data = next((r for r in clip.roles if r.role_id == player.assigned_role_id), None)
                            if role_data:
                                await self.send_to_socket(ws, "server:game:role_assign", {
                                    "clip": clip.model_dump(),
                                    "role": role_data.model_dump()
                                })

                await self.broadcast_room_state(room_code)
            except Exception as e:
                await self.send_to_socket(websocket, "server:error", {"message": str(e)})
            return

        # 5. Синхронный старт записи
        if event == "client:game:request_start_recording":
            countdown_ms = payload.get("countdownMs", 3000)
            try:
                start_at_ms, duration_ms = self.room_manager.schedule_recording(room_code, countdown_ms)
                await self.broadcast_to_room(room_code, "server:game:start_recording", {
                    "startAtServerTimestamp": start_at_ms,
                    "durationMs": duration_ms,
                    "countdownMs": countdown_ms
                })
                await self.broadcast_room_state(room_code)
            except Exception as e:
                await self.send_to_socket(websocket, "server:error", {"message": str(e)})
            return

        # 6. Уведомление о загрузке аудиодорожки
        if event == "client:game:audio_uploaded":
            player_id = meta.get("player_id") or payload.get("playerId")
            audio_url = payload.get("audioUrl")
            lead_in = payload.get("leadInOffsetMs", 0)
            duration = payload.get("durationMs", 0)

            self.room_manager.submit_audio(room_code, player_id, audio_url, lead_in, duration)
            await self.broadcast_room_state(room_code)

            # Если все игроки загрузили дорожки, сообщаем хосту о готовности к показу
            if self.room_manager.check_all_audio_uploaded(room_code):
                await self.broadcast_to_room(room_code, "server:game:all_audio_ready", {})
            return

        # 7. Синхронный старт воспроизведения («Кинозал»)
        if event == "client:game:request_playback":
            try:
                start_playback_ms = self.room_manager.schedule_playback(room_code, delay_ms=1500)
                room = self.room_manager.get_room(room_code)
                clip = self.room_manager.clips.get(room.current_clip_id)

                tracks = [
                    {
                        "playerId": p.player_id,
                        "nickname": p.nickname,
                        "avatarId": p.avatar_id,
                        "audioUrl": p.audio_url,
                        "leadInOffsetMs": p.lead_in_offset_ms,
                        "roleId": p.assigned_role_id
                    }
                    for p in room.players.values()
                    if p.audio_url
                ]

                await self.broadcast_to_room(room_code, "server:game:playback_start", {
                    "playbackStartAtServerTimestamp": start_playback_ms,
                    "clip": clip.model_dump() if clip else None,
                    "tracks": tracks
                })
                await self.broadcast_room_state(room_code)
            except Exception as e:
                await self.send_to_socket(websocket, "server:error", {"message": str(e)})
            return

        # 8. Реакции (эмодзи пушка)
        if event == "client:game:reaction":
            emoji = payload.get("emoji", "🔥")
            player_id = meta.get("player_id")
            await self.broadcast_to_room(room_code, "server:game:reaction", {
                "emoji": emoji,
                "playerId": player_id
            })
            return

        # 9. Голосование
        if event == "client:game:vote":
            target_id = payload.get("targetPlayerId")
            if target_id:
                self.room_manager.vote(room_code, target_id)
                await self.broadcast_room_state(room_code)
            return

        # 10. Показ результатов
        if event == "client:game:show_results":
            results = self.room_manager.calculate_results(room_code)
            await self.broadcast_to_room(room_code, "server:game:results", results)
            await self.broadcast_room_state(room_code)
            return

        # 11. Возврат в лобби для нового раунда
        if event == "client:game:return_to_lobby":
            self.room_manager.reset_to_lobby(room_code)
            await self.broadcast_room_state(room_code)
            return

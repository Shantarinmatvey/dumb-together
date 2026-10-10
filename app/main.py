import os
import shutil
import uuid
import time
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel

from app.room_manager import RoomManager
from app.websocket_handler import WebSocketConnectionManager

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Dumb Together Party Game API",
    description="Backend API и WebSocket шлюз для браузерной пати-игры Dumb Together",
    version="1.0.0"
)

# Разрешаем CORS для кроссдоменных подключений и локальной сети
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

room_manager = RoomManager()
ws_manager = WebSocketConnectionManager(room_manager)


class CreateRoomRequest(BaseModel):
    hostNickname: str = "HostScreen"
    avatarId: str = "tv"


@app.get("/")
async def root():
    return RedirectResponse(url="/static/index.html")


@app.post("/api/rooms")
async def create_room(req: CreateRoomRequest):
    room, host_player = room_manager.create_room(req.hostNickname, req.avatarId)
    return {
        "roomCode": room.room_code,
        "hostPlayerId": host_player.player_id,
        "sessionToken": host_player.session_token
    }


@app.get("/api/rooms/{room_code}")
async def get_room(room_code: str):
    room = room_manager.get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")
    return {
        "roomCode": room.room_code,
        "stage": room.stage.value,
        "playersCount": len(room.players)
    }


@app.get("/api/clips")
async def get_clips():
    return [clip.model_dump() for clip in room_manager.clips.values()]


@app.post("/api/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    playerId: str = Form(...),
    roomCode: str = Form(...)
):
    try:
        # Генерируем уникальное имя файла с сохранением расширения
        filename = file.filename or "recording.webm"
        ext = os.path.splitext(filename)[1] or ".webm"
        safe_filename = f"{roomCode}_{playerId}_{uuid.uuid4().hex[:8]}{ext}"
        destination = UPLOADS_DIR / safe_filename

        with open(destination, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        audio_url = f"/uploads/{safe_filename}"
        return JSONResponse(status_code=200, content={"audioUrl": audio_url})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения аудио: {str(e)}")


@app.websocket("/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str):
    await ws_manager.connect(websocket, room_code)
    try:
        while True:
            data = await websocket.receive_text()
            await ws_manager.handle_message(websocket, data)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        await ws_manager.broadcast_room_state(room_code)
    except Exception:
        ws_manager.disconnect(websocket)


# Раздача статики и загруженного аудио
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

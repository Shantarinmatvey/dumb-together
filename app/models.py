from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class GameStage(str, Enum):
    LOBBY = "LOBBY"
    PREVIEW = "PREVIEW"
    COUNTDOWN = "COUNTDOWN"
    RECORDING = "RECORDING"
    UPLOADING = "UPLOADING"
    PLAYBACK = "PLAYBACK"
    RESULTS = "RESULTS"


class PeakWindow(BaseModel):
    start_ms: int
    end_ms: int


class Cue(BaseModel):
    cue_id: str
    start_ms: int
    end_ms: int
    type: str = "VOICE_SPEECH"  # SFX_VOICE, VOICE_SPEECH, SFX_IMPACT, SFX_RHYTHMIC, etc.
    text_prompt: str
    expected_peak_windows: List[PeakWindow] = Field(default_factory=list)
    scoring_weight: float = 1.0


class Role(BaseModel):
    role_id: str
    name: str
    color: str = "#3B82F6"
    avatar_placeholder: str = "mic"
    cues: List[Cue] = Field(default_factory=list)


class Clip(BaseModel):
    clip_id: str
    title: str
    duration_ms: int
    video_url: str = ""
    thumbnail_url: str = ""
    roles_count_required: int = 3
    roles: List[Role] = Field(default_factory=list)


class Player(BaseModel):
    player_id: str
    session_token: str
    nickname: str
    avatar_id: str
    is_host: bool = False
    assigned_role_id: Optional[str] = None
    mic_ready: bool = False
    audio_url: Optional[str] = None
    lead_in_offset_ms: int = 0
    audio_duration_ms: int = 0
    score: int = 0
    votes: int = 0


class RoomState(BaseModel):
    room_code: str
    host_player_id: Optional[str] = None
    stage: GameStage = GameStage.LOBBY
    current_clip_id: Optional[str] = None
    players: Dict[str, Player] = Field(default_factory=dict)
    scheduled_start_timestamp_ms: Optional[int] = None
    scheduled_duration_ms: Optional[int] = None
    scheduled_playback_timestamp_ms: Optional[int] = None

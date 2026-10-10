import unittest
from app.room_manager import RoomManager
from app.models import GameStage


class TestRoomManager(unittest.TestCase):
    def setUp(self):
        self.mgr = RoomManager()

    def test_create_room(self):
        room, host = self.mgr.create_room("TestHost", "tv")
        self.assertIsNotNone(room.room_code)
        self.assertEqual(len(room.room_code), 4)
        self.assertTrue(host.is_host)
        self.assertEqual(room.stage, GameStage.LOBBY)
        self.assertIn(host.player_id, room.players)

    def test_join_room(self):
        room, host = self.mgr.create_room("Host", "tv")
        joined_room, player = self.mgr.join_room(room.room_code, "Player1", "fox")
        self.assertEqual(len(joined_room.players), 2)
        self.assertFalse(player.is_host)
        self.assertEqual(player.nickname, "Player1")

    def test_role_assignment(self):
        room, host = self.mgr.create_room("Host", "tv")
        _, p1 = self.mgr.join_room(room.room_code, "Player1", "fox")
        _, p2 = self.mgr.join_room(room.room_code, "Player2", "dog")

        clip = self.mgr.start_preview(room.room_code, "clip_heist")
        self.assertEqual(room.stage, GameStage.PREVIEW)
        self.assertIsNotNone(p1.assigned_role_id)
        self.assertIsNotNone(p2.assigned_role_id)

    def test_scheduled_recording(self):
        room, host = self.mgr.create_room("Host", "tv")
        self.mgr.start_preview(room.room_code, "clip_heist")
        start_at_ms, duration_ms = self.mgr.schedule_recording(room.room_code, countdown_ms=2000)
        self.assertEqual(room.stage, GameStage.RECORDING)
        self.assertGreater(start_at_ms, 0)
        self.assertEqual(duration_ms, 7500)

    def test_audio_submission_and_check(self):
        room, host = self.mgr.create_room("Host", "tv")
        _, p1 = self.mgr.join_room(room.room_code, "Player1", "fox")
        self.mgr.start_preview(room.room_code, "clip_heist")

        self.assertFalse(self.mgr.check_all_audio_uploaded(room.room_code))
        self.mgr.submit_audio(room.room_code, p1.player_id, "/uploads/test.webm", 20, 7500)
        self.assertTrue(self.mgr.check_all_audio_uploaded(room.room_code))

    def test_calculate_results(self):
        room, host = self.mgr.create_room("Host", "tv")
        _, p1 = self.mgr.join_room(room.room_code, "Player1", "fox")
        self.mgr.start_preview(room.room_code, "clip_heist")
        self.mgr.vote(room.room_code, p1.player_id)
        self.mgr.vote(room.room_code, p1.player_id)

        results = self.mgr.calculate_results(room.room_code)
        self.assertIn("leaderboard", results)
        leaderboard = results["leaderboard"]
        self.assertEqual(len(leaderboard), 1)
        self.assertEqual(leaderboard[0]["player_id"], p1.player_id)
        self.assertEqual(leaderboard[0]["votes"], 2)


if __name__ == "__main__":
    unittest.main()

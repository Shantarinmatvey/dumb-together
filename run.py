import socket
import uvicorn


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Подключаемся к внешнему IP без отправки пакетов для получения сетевого интерфейса
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def print_banner(host: str, port: int, local_ip: str):
    print("=" * 70)
    print("        🎭 DUMB TOGETHER — BROWSER PARTY GAME SERVER 🎭")
    print("=" * 70)
    print(f"  📺 Главный экран (Host/ПК):    http://localhost:{port}/static/host.html")
    print(f"  📱 Смартфоны игроков (Wi-Fi):   http://{local_ip}:{port}/static/controller.html")
    print(f"  🌐 Главное меню выбора:        http://localhost:{port}/")
    print("=" * 70)
    print("  Сервер слушает на всех интерфейсах (0.0.0.0).")
    print("  Нажмите Ctrl+C для остановки сервера.")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    port = 8000
    host = "0.0.0.0"
    local_ip = get_local_ip()
    print_banner(host, port, local_ip)
    uvicorn.run("app.main:app", host=host, port=port, reload=True)

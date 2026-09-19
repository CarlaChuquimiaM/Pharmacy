import socket

from waitress import serve

from app import create_app

app = create_app()


def obtener_ip_local():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


if __name__ == "__main__":
    ip = obtener_ip_local()
    print("Sistema de farmacia iniciado.")
    print(f"En esta PC: http://localhost:8000")
    print(f"Desde otras PCs de la misma red: http://{ip}:8000")
    serve(app, host="0.0.0.0", port=8000)

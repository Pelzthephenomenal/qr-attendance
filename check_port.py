import socket

def check_port(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(2)
        try:
            s.connect((host, port))
            print(f"SUCCESS: Port {port} is open on {host}!")
            return True
        except Exception as e:
            print(f"FAILED: Port {port} is closed on {host}. Error: {e}")
            return False

check_port('127.0.0.1', 8000)
check_port('localhost', 8000)
check_port('0.0.0.0', 8000)

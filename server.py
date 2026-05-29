#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
import os
from pathlib import Path

PORT = 8000
os.chdir(Path(__file__).parent)

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")

try:
    with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"\n✓ Serveur lancé sur {url}")
        print("Appuyez sur CTRL+C pour arrêter\n")
        webbrowser.open(url)
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServeur arrêté")
except Exception as e:
    print(f"Erreur: {e}")
    print("Vérifiez que Python est correctement installé")
    input("Appuyez sur Entrée...")

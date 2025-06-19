import socket
import threading
import json
import time
from datetime import datetime


class UDPServer:
    def __init__(self, host='0.0.0.0', port=8888, callback=None):
        self.host = host
        self.port = port
        self.callback = callback
        self.socket = None
        self.running = False
        self.thread = None

    def start(self):
        """启动UDP服务器"""
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.socket.bind((self.host, self.port))
        self.running = True

        self.thread = threading.Thread(target=self._listen)
        self.thread.daemon = True
        self.thread.start()

        print(f"UDP服务器启动在 {self.host}:{self.port}")

    def stop(self):
        """停止UDP服务器"""
        self.running = False
        if self.socket:
            self.socket.close()
        print("UDP服务器已停止")

    def _listen(self):
        """监听UDP数据"""
        while self.running:
            try:
                data, addr = self.socket.recvfrom(1024)
                timestamp = datetime.now().isoformat()

                # 构造数据包
                packet = {
                    'data': data.decode('utf-8', errors='ignore'),
                    'from': f"{addr[0]}:{addr[1]}",
                    'timestamp': timestamp,
                    'size': len(data)
                }

                # 如果有回调函数，立即调用
                if self.callback:
                    self.callback(packet)

            except Exception as e:
                if self.running:
                    print(f"UDP接收错误: {e}")
                break
from flask import Flask, render_template, send_from_directory
import threading
import asyncio
from utils import UDPServer
from websocket_server import WebSocketServer
from dotenv import load_dotenv
import os

app = Flask(__name__)

# Load environment variables from .env file
ws_host = os.getenv('WS_HOST', '0.0.0.0')
ws_port = int(os.getenv('WS_PORT', 8080))
udp_host = os.getenv('UDP_HOST', '0.0.0.0')
udp_port = int(os.getenv('UDP_PORT', 8888))
flask_host = os.getenv('FLASK_HOST', '0.0.0.0')
flask_port = int(os.getenv('FLASK_PORT', 5000))

# 创建WebSocket服务器实例
ws_server = WebSocketServer(host=ws_host, port=ws_port)

def udp_data_callback(data):
    """UDP数据回调函数，立即转发给WebSocket"""
    ws_server.send_udp_data(data)


# 创建UDP服务器实例
udp_server = UDPServer(host=udp_host, port=udp_port, callback=udp_data_callback)


@app.route('/')
def index():
    """主页面"""
    return send_from_directory('static', 'index.html')


@app.route('/static/<path:filename>')
def static_files(filename):
    """静态文件服务"""
    return send_from_directory('static', filename)


def start_websocket_server():
    """在单独线程中启动WebSocket服务器"""
    ws_server.start()


def start_servers():
    """启动所有服务器"""
    # 启动UDP服务器
    udp_server.start()

    # 在单独线程中启动WebSocket服务器
    ws_thread = threading.Thread(target=start_websocket_server)
    ws_thread.daemon = True
    ws_thread.start()


if __name__ == '__main__':
    # 启动UDP和WebSocket服务器
    start_servers()

    # 启动Flask应用
    print(f"主服务器启动在端口 {flask_port}")
    print(f"访问 http://{flask_host}:{flask_port} 查看实时数据")
    app.run(host=flask_host, port=flask_port, debug=False)
from flask import Flask, render_template, send_from_directory, jsonify, request
import threading
import asyncio
from utils import UDPServer
from utils import WebSocketServer
from dotenv import load_dotenv
import os

app = Flask(__name__, static_folder='static', static_url_path='')

# 加载环境变量
load_dotenv()

# 获取配置
ws_host = os.getenv('WS_HOST', '0.0.0.0')
ws_port = int(os.getenv('WS_PORT', 8080))
udp_host = os.getenv('UDP_HOST', '0.0.0.0')
udp_port = int(os.getenv('UDP_PORT', 8888))
flask_host = os.getenv('FLASK_HOST', '0.0.0.0')
flask_port = int(os.getenv('FLASK_PORT', 5000))

# 创建WebSocket服务器实例（内置数据处理器）
ws_server = WebSocketServer(host=ws_host, port=ws_port)


def udp_data_callback(data):
    """UDP数据回调函数，转发给WebSocket服务器进行处理"""
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


@app.route('/api/settings', methods=['GET', 'POST'])
def settings_api():
    """设置API端点"""
    data_processor = ws_server.get_data_processor()

    if request.method == 'GET':
        # 获取所有设置
        return jsonify(data_processor.get_all_settings())

    elif request.method == 'POST':
        # 更新设置
        data = request.get_json()
        key = data.get('key')
        value = data.get('value')

        if data_processor.update_setting(key, value):
            return jsonify({'success': True, 'message': '设置已更新'})
        else:
            return jsonify({'success': False, 'message': '无效的设置键'}), 400


@app.route('/api/stats')
def stats_api():
    """统计API端点"""
    data_processor = ws_server.get_data_processor()
    stats = data_processor.get_stats_summary()

    if stats:
        return jsonify(stats)
    else:
        return jsonify({'message': '暂无统计数据'})


@app.route('/api/export')
def export_api():
    """导出数据API端点"""
    data_processor = ws_server.get_data_processor()
    export_data = data_processor.export_data()
    return jsonify(export_data)


@app.route('/api/reset', methods=['POST'])
def reset_api():
    """重置数据API端点"""
    data_processor = ws_server.get_data_processor()
    result = data_processor.reset_lap_data()
    return jsonify(result)


@app.route('/api/status')
def status_api():
    """系统状态API端点"""
    return jsonify({
        'websocket_clients': len(ws_server.clients),
        'server_running': True,
        'version': '1.8.5',
        'data_processor_active': True
    })


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
    print(f"UDP服务器: {udp_host}:{udp_port}")
    print(f"WebSocket服务器: {ws_host}:{ws_port}")

    app.run(host=flask_host, port=flask_port, debug=False)
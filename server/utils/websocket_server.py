import asyncio
import websockets
import json
import threading
from concurrent.futures import ThreadPoolExecutor
from .data_processor import DataProcessor


class WebSocketServer:
    def __init__(self, host='0.0.0.0', port=8080):
        self.host = host
        self.port = port
        self.clients = set()
        self.loop = None
        self.server = None

        # 初始化数据处理器
        self.data_processor = DataProcessor(self)

    async def register(self, websocket):
        """注册客户端"""
        self.clients.add(websocket)
        print(f"客户端连接: {websocket.remote_address}")

        # 发送当前设置给新连接的客户端
        await self.send_to_client(websocket, {
            'type': 'settings_update',
            'settings': self.data_processor.get_all_settings()
        })

    async def unregister(self, websocket):
        """注销客户端"""
        self.clients.discard(websocket)
        print(f"客户端断开: {websocket.remote_address}")

    async def broadcast(self, message):
        """广播消息给所有客户端"""
        if self.clients:
            # 创建客户端副本，避免在迭代时修改
            clients_copy = self.clients.copy()
            if clients_copy:
                # 使用gather来并发发送，减少延迟
                results = await asyncio.gather(
                    *[self._safe_send(client, message) for client in clients_copy],
                    return_exceptions=True
                )

    async def send_to_client(self, client, data):
        """发送数据给指定客户端"""
        try:
            message = json.dumps(data) if isinstance(data, dict) else data
            await client.send(message)
        except websockets.exceptions.ConnectionClosed:
            self.clients.discard(client)
        except Exception as e:
            print(f"发送消息到客户端错误: {e}")
            self.clients.discard(client)

    async def _safe_send(self, client, message):
        """安全发送消息，处理断开的连接"""
        try:
            await client.send(message)
        except websockets.exceptions.ConnectionClosed:
            self.clients.discard(client)
        except Exception as e:
            print(f"发送消息错误: {e}")
            self.clients.discard(client)

    async def handle_client(self, websocket):
        """处理客户端连接"""
        await self.register(websocket)
        try:
            async for message in websocket:
                # 处理客户端发来的消息
                await self.handle_client_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            print(f"客户端处理错误: {e}")
        finally:
            await self.unregister(websocket)

    async def handle_client_message(self, websocket, message):
        """处理客户端消息"""
        try:
            data = json.loads(message)
            message_type = data.get('type')

            if message_type == 'setting_update':
                # 处理设置更新
                key = data.get('key')
                value = data.get('value')
                if self.data_processor.update_setting(key, value):
                    # 广播设置更新给所有客户端
                    await self.broadcast(json.dumps({
                        'type': 'setting_updated',
                        'key': key,
                        'value': value
                    }))

            elif message_type == 'reset_data':
                # 处理数据重置
                reset_result = self.data_processor.reset_lap_data()
                await self.broadcast(json.dumps(reset_result))

            elif message_type == 'export_data':
                # 处理数据导出请求
                export_data = self.data_processor.export_data()
                await self.send_to_client(websocket, {
                    'type': 'export_data_response',
                    'data': export_data
                })

            elif message_type == 'get_stats':
                # 获取统计信息
                stats = self.data_processor.get_stats_summary()
                await self.send_to_client(websocket, {
                    'type': 'stats_response',
                    'stats': stats
                })

        except json.JSONDecodeError:
            print(f"无效的JSON消息: {message}")
        except Exception as e:
            print(f"处理客户端消息错误: {e}")

    def send_udp_data(self, udp_packet):
        """接收UDP数据并处理后广播"""
        if self.loop and not self.loop.is_closed():
            # 在数据处理器中处理UDP数据
            processed_data = self.data_processor.process_udp_data(udp_packet)

            if processed_data:
                # 线程安全地调度协程
                asyncio.run_coroutine_threadsafe(
                    self.broadcast(json.dumps(processed_data)),
                    self.loop
                )

    async def start_server(self):
        """启动WebSocket服务器"""
        self.server = await websockets.serve(
            self.handle_client,
            self.host,
            self.port,
            ping_interval=20,
            ping_timeout=10
        )
        print(f"WebSocket服务器启动在 ws://{self.host}:{self.port}")

    def start(self):
        """在新线程中启动WebSocket服务器"""

        def run_server():
            # 创建新的事件循环
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)

            try:
                # 启动服务器
                self.loop.run_until_complete(self.start_server())
                # 运行事件循环
                self.loop.run_forever()
            except Exception as e:
                print(f"WebSocket服务器错误: {e}")
            finally:
                self.loop.close()

        # 在新线程中运行
        thread = threading.Thread(target=run_server)
        thread.daemon = True
        thread.start()

        # 等待一下确保服务器启动
        import time
        time.sleep(0.5)

    def get_data_processor(self):
        """获取数据处理器实例"""
        return self.data_processor
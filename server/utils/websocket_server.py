import asyncio
import websockets
import json
import threading
from concurrent.futures import ThreadPoolExecutor
import traceback
import time


class WebSocketServer:
    def __init__(self, host='0.0.0.0', port=8080):
        self.host = host
        self.port = port
        self.clients = set()
        self.loop = None
        self.server = None

        # 线程池用于处理耗时操作
        self.executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="WSServer")

        # 初始化数据处理器
        from .data_processor import DataProcessor
        self.data_processor = DataProcessor(self)

    async def register(self, websocket):
        """注册客户端"""
        self.clients.add(websocket)
        print(f"客户端连接: {websocket.remote_address}")

        # 发送当前设置给新连接的客户端
        try:
            await self.send_to_client(websocket, {
                'type': 'settings_update',
                'settings': self.data_processor.get_all_settings()
            })
            print(f"✅ 已发送当前设置给新客户端: {self.data_processor.get_all_settings()}")
        except Exception as e:
            print(f"❌ 发送设置给新客户端失败: {e}")

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
                print(f"📡 广播消息给 {len(clients_copy)} 个客户端")
                # 使用gather来并发发送，减少延迟
                results = await asyncio.gather(
                    *[self._safe_send(client, message) for client in clients_copy],
                    return_exceptions=True
                )

                # 检查发送结果
                success_count = sum(1 for r in results if not isinstance(r, Exception))
                print(f"📡 广播结果: {success_count}/{len(clients_copy)} 成功")

    async def send_to_client(self, client, data, timeout=30):
        """发送数据给指定客户端（带超时）"""
        try:
            message = json.dumps(data) if isinstance(data, dict) else data

            # 检查消息大小
            message_size = len(message.encode('utf-8')) / 1024 / 1024  # MB
            print(f"📦 发送消息大小: {message_size:.2f} MB")

            # 带超时的发送
            await asyncio.wait_for(client.send(message), timeout=timeout)
            return True

        except asyncio.TimeoutError:
            print(f"⏰ 发送消息超时 ({timeout}秒)")
            self.clients.discard(client)
            return False
        except websockets.exceptions.ConnectionClosed:
            self.clients.discard(client)
            return False
        except Exception as e:
            print(f"发送消息到客户端错误: {e}")
            self.clients.discard(client)
            return False

    async def _safe_send(self, client, message):
        """安全发送消息，处理断开的连接"""
        try:
            # 检查消息大小，如果太大就跳过广播
            message_size = len(message.encode('utf-8')) / 1024 / 1024
            if message_size > 50:  # 超过50MB就不广播了
                print(f"⚠️ 消息过大 ({message_size:.2f} MB)，跳过广播")
                return False

            await asyncio.wait_for(client.send(message), timeout=10)
            return True
        except asyncio.TimeoutError:
            print("⏰ 广播消息超时")
            self.clients.discard(client)
            return False
        except websockets.exceptions.ConnectionClosed:
            self.clients.discard(client)
            return False
        except Exception as e:
            print(f"发送消息错误: {e}")
            self.clients.discard(client)
            return False

    async def handle_client(self, websocket):
        """处理客户端连接"""
        await self.register(websocket)
        try:
            async for message in websocket:
                # 处理客户端发来的消息
                try:
                    await self.handle_client_message(websocket, message)
                except Exception as e:
                    print(f"❌ 处理客户端消息异常: {e}")
                    print(f"❌ 异常详情: {traceback.format_exc()}")
        except websockets.exceptions.ConnectionClosed:
            print(f"客户端连接已关闭: {websocket.remote_address}")
        except Exception as e:
            print(f"客户端处理错误: {e}")
            print(f"❌ 异常详情: {traceback.format_exc()}")
        finally:
            await self.unregister(websocket)

    async def handle_client_message(self, websocket, message):
        """处理客户端消息"""
        try:
            print(f"📥 收到客户端消息: {message[:200]}..." if len(message) > 200 else f"📥 收到客户端消息: {message}")
            data = json.loads(message)
            message_type = data.get('type')
            print(f"📥 消息类型: {message_type}")

            if message_type == 'setting_update':
                # 处理设置更新
                key = data.get('key')
                value = data.get('value')
                print(f"🔧 处理设置更新: {key} = {value}")

                if self.data_processor.update_setting(key, value):
                    # 广播设置更新给所有客户端
                    update_message = {
                        'type': 'setting_updated',
                        'key': key,
                        'value': value,
                        'timestamp': self.get_timestamp()
                    }
                    await self.broadcast(json.dumps(update_message))
                    print(f"✅ 设置更新已广播: {key} = {value}")
                else:
                    # 发送错误消息给请求的客户端
                    error_message = {
                        'type': 'setting_error',
                        'key': key,
                        'value': value,
                        'error': f'无效的设置键: {key}',
                        'timestamp': self.get_timestamp()
                    }
                    await self.send_to_client(websocket, error_message)
                    print(f"❌ 设置更新失败: {key} = {value}")

            elif message_type == 'reset_data':
                # 处理数据重置
                print("🔄 处理数据重置请求")
                reset_result = self.data_processor.reset_lap_data()
                await self.broadcast(json.dumps(reset_result))
                print("✅ 数据重置已广播")

            elif message_type == 'get_stats':
                # 获取统计信息
                print("📊 处理统计信息请求")
                stats = self.data_processor.get_stats_summary()
                response = {
                    'type': 'stats_response',
                    'stats': stats,
                    'timestamp': self.get_timestamp()
                }
                await self.send_to_client(websocket, response)
                print("✅ 统计信息响应已发送")

            elif message_type == 'get_settings':
                # 获取当前所有设置
                print("⚙️ 处理获取设置请求")
                settings = self.data_processor.get_all_settings()
                response = {
                    'type': 'settings_update',
                    'settings': settings,
                    'timestamp': self.get_timestamp()
                }
                await self.send_to_client(websocket, response)
                print(f"✅ 设置信息已发送: {settings}")

            elif message_type == 'get_memory_usage':
                # 获取内存使用情况
                print("💾 处理内存使用查询")
                memory_usage = self.data_processor.get_memory_usage()
                response = {
                    'type': 'memory_usage_response',
                    'memoryUsage': memory_usage,
                    'timestamp': self.get_timestamp()
                }
                await self.send_to_client(websocket, response)
                print(f"✅ 内存使用信息已发送: {memory_usage}")

            elif message_type in ['export_data', 'export_data_minimal']:
                # 导出功能已删除，发送错误响应
                print(f"❌ 导出功能已删除，拒绝请求: {message_type}")
                error_response = {
                    'type': 'export_data_error',
                    'error': '导出功能已删除',
                    'timestamp': self.get_timestamp()
                }
                await self.send_to_client(websocket, error_response)

            else:
                print(f"⚠️ 未知的消息类型: {message_type}")
                error_response = {
                    'type': 'error',
                    'message': f'未知的消息类型: {message_type}',
                    'timestamp': self.get_timestamp()
                }
                await self.send_to_client(websocket, error_response)

        except json.JSONDecodeError as e:
            print(f"❌ JSON解析错误: {e}, 消息: {message}")
            error_response = {
                'type': 'error',
                'message': f'JSON解析错误: {str(e)}',
                'timestamp': self.get_timestamp()
            }
            await self.send_to_client(websocket, error_response)
        except Exception as e:
            print(f"❌ 处理客户端消息异常: {e}")
            print(f"❌ 异常详情: {traceback.format_exc()}")
            error_response = {
                'type': 'error',
                'message': f'服务器错误: {str(e)}',
                'timestamp': self.get_timestamp()
            }
            await self.send_to_client(websocket, error_response, timeout=5)

    def send_udp_data(self, udp_packet):
        """接收UDP数据并处理后广播"""
        try:
            print(f"🔍 WebSocket服务器收到UDP数据: {udp_packet}")

            if self.loop and not self.loop.is_closed():
                # 在数据处理器中处理UDP数据
                processed_data = self.data_processor.process_udp_data(udp_packet)

                if processed_data:
                    print(f"🔍 处理后的数据: {processed_data}")
                    # 线程安全地调度协程
                    future = asyncio.run_coroutine_threadsafe(
                        self.broadcast(json.dumps(processed_data)),
                        self.loop
                    )
                    # 可选：等待广播完成（但不阻塞太久）
                    try:
                        future.result(timeout=2.0)  # 最多等待2秒
                    except asyncio.TimeoutError:
                        print("⚠️ 广播超时，但继续处理")
                else:
                    print("⚠️ 数据处理器返回None，跳过广播")
            else:
                print("⚠️ 事件循环不可用，跳过处理")
        except Exception as e:
            print(f"❌ 处理UDP数据异常: {e}")
            print(f"❌ 异常详情: {traceback.format_exc()}")

    def get_timestamp(self):
        """获取当前时间戳"""
        from datetime import datetime
        return datetime.now().isoformat()

    async def start_server(self):
        """启动WebSocket服务器"""
        self.server = await websockets.serve(
            self.handle_client,
            self.host,
            self.port,
            ping_interval=20,
            ping_timeout=10,
            max_size=10 * 1024 * 1024,  # 10MB最大消息大小
            compression='deflate'  # 启用压缩
        )
        print(f"WebSocket服务器启动在 ws://{self.host}:{self.port}")
        print(f"数据处理器已集成，处理逻辑已移至后端")
        print(f"支持最大消息大小: 10MB，启用deflate压缩")
        print(f"❌ 导出功能已删除")

    def start(self):
        """在新线程中启动WebSocket服务器"""

        def run_server():
            # 创建新的事件循环
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)

            try:
                # 启动服务器
                self.loop.run_until_complete(self.start_server())
                print("✅ WebSocket服务器事件循环已启动")
                # 运行事件循环
                self.loop.run_forever()
            except Exception as e:
                print(f"WebSocket服务器错误: {e}")
                print(f"❌ 异常详情: {traceback.format_exc()}")
            finally:
                print("🔄 WebSocket服务器事件循环已关闭")
                # 关闭线程池
                self.executor.shutdown(wait=True)
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

    def get_connection_count(self):
        """获取当前连接数"""
        return len(self.clients)

    def get_server_status(self):
        """获取服务器状态"""
        return {
            'running': self.server is not None,
            'clients': len(self.clients),
            'host': self.host,
            'port': self.port,
            'loop_running': self.loop is not None and not self.loop.is_closed(),
            'executor_running': not self.executor._shutdown,
            'export_feature': 'Removed'
        }
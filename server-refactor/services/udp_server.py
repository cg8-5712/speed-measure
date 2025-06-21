"""
UDP服务器
负责接收ESP8266发送的UDP数据包
"""

import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class UDPServer:
    """UDP服务器"""
    
    def __init__(self, data_processor):
        self.data_processor = data_processor
        self.transport: Optional[asyncio.DatagramTransport] = None
        self.protocol: Optional['UDPProtocol'] = None
        self.is_running = False
    
    async def start(self):
        """启动UDP服务器"""
        from config import settings
        
        loop = asyncio.get_event_loop()
        
        # 创建UDP端点
        transport, protocol = await loop.create_datagram_endpoint(
            lambda: UDPProtocol(self.data_processor),
            local_addr=(settings.udp_host, settings.udp_port)
        )
        
        self.transport = transport
        self.protocol = protocol
        self.is_running = True
        
        logger.info("UDP服务器已启动在 %s:%d", settings.udp_host, settings.udp_port)
    
    async def stop(self):
        """停止UDP服务器"""
        if self.transport:
            self.transport.close()
            self.is_running = False
            logger.info("UDP服务器已停止")


class UDPProtocol(asyncio.DatagramProtocol):
    """UDP协议处理器"""
    
    def __init__(self, data_processor):
        self.data_processor = data_processor
        super().__init__()
    
    def connection_made(self, transport):
        """连接建立时调用"""
        self.transport = transport
        logger.info("UDP协议已建立")
    
    def datagram_received(self, data: bytes, addr: tuple):
        """接收到数据包时调用"""
        try:
            # 解码数据
            raw_data = data.decode('utf-8')
            
            # 异步处理数据
            asyncio.create_task(
                self.data_processor.process_udp_data(raw_data, addr)
            )
            
        except UnicodeDecodeError as e:
            logger.error("UDP数据解码失败: %s, 原始数据: %s", e, data)
        except Exception as e:
            logger.error("处理UDP数据包时发生错误: %s", e)
    
    def error_received(self, exc):
        """接收到错误时调用"""
        logger.error("UDP协议错误: %s", exc)
    
    def connection_lost(self, exc):
        """连接丢失时调用"""
        if exc:
            logger.error("UDP连接丢失: %s", exc)
        else:
            logger.info("UDP连接正常关闭")

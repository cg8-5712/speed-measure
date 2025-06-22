"""
数据处理器
负责处理UDP接收到的数据，计算速度和圈速
"""

import logging
import time
from datetime import datetime
from typing import Optional
from config import settings

logger = logging.getLogger(__name__)


class DataProcessor:
    """数据处理器"""
    
    def __init__(self, websocket_manager):
        self.websocket_manager = websocket_manager
        self.reset_data()
    
    def reset_data(self):
        """重置数据"""
        self.is_first_data = True
        self.lap_count = 0
        self.total_time = 0.0
        self.last_data_time = None
        self.lap_times = []
        logger.info("数据处理器已重置所有数据")
        
    async def process_udp_data(self, raw_data: str, addr: tuple):
        """处理UDP数据"""
        try:
            # 解析时间戳
            timestamp_ms = float(raw_data.strip())
            current_time = time.time() * 1000  # 当前时间戳(毫秒)
            
            logger.info("收到UDP数据: %s ms from %s", timestamp_ms, addr)
            
            # 处理首次数据
            if self.is_first_data:
                await self._handle_first_data(timestamp_ms, current_time, addr)
                return
            
            # 处理正常数据
            await self._process_lap_data(timestamp_ms, current_time, addr)
            
        except ValueError as e:
            logger.error("数据解析错误: %s, 原始数据: %s", e, raw_data)
        except Exception as e:
            logger.error("处理UDP数据时发生错误: %s", e)
    
    async def _handle_first_data(self, timestamp_ms: float, current_time: float, addr: tuple):
        """处理首次数据"""
        self.is_first_data = False
        self.last_data_time = current_time
        
        logger.info("首次数据初始化完成，时间戳: %s ms", timestamp_ms)
        
        # 发送初始化消息
        await self.websocket_manager.send_data({
            'type': 'init',
            'message': '系统已初始化，开始监测...',
            'timestamp': current_time,
            'from': f"{addr[0]}:{addr[1]}"
        })
    
    async def _process_lap_data(self, timestamp_ms: float, current_time: float, addr: tuple):
        """处理圈速数据"""
        # 计算时间间隔
        interval_ms = current_time - self.last_data_time
        self.last_data_time = current_time
        self.lap_count += 1
        
        # 计算圈用时(秒)
        lap_time = self._calculate_lap_time(interval_ms, timestamp_ms)
        self.total_time += lap_time
        self.lap_times.append(lap_time)
        
        # 计算速度
        speed = self._calculate_speed(lap_time)
        
        logger.info("圈数: %d, 圈用时: %.3f秒, 速度: %.2f", 
                   self.lap_count, lap_time, speed)
        
        # 构造数据包
        data_packet = {
            'type': 'lap_data',
            'lap_number': self.lap_count,
            'lap_time': round(lap_time, 3),
            'total_time': round(self.total_time, 3),
            'speed': round(speed, 2),
            'timestamp': current_time,
            'measurement': timestamp_ms,
            'interval': round(interval_ms, 1),
            'from': f"{addr[0]}:{addr[1]}",
            'recent_laps': self._get_recent_laps_stats()
        }
        
        # 发送数据给WebSocket客户端
        await self.websocket_manager.send_data(data_packet)
    
    def _calculate_lap_time(self, interval_ms: float, measurement_ms: float) -> float:
        """计算圈用时"""
        # 使用测量值作为主要时间源，间隔时间作为校准
        # 这里可以根据实际需求调整算法
        return ( interval_ms + measurement_ms ) /1000
    
    def _calculate_speed(self, lap_time: float) -> float:
        """计算速度"""
        if lap_time <= 0:
            return 0.0
        
        # 使用配置中的物理常量计算速度
        # 速度 = 距离 / 时间
        distance = settings.distance_l
        speed = distance / lap_time
        
        return speed
    
    def _get_recent_laps_stats(self, count: int = 3) -> dict:
        """获取最近几圈的统计信息"""
        if len(self.lap_times) == 0:
            return {
                'count': 0,
                'total_time': 0.0,
                'average_time': 0.0,
                'best_time': 0.0
            }
        
        recent_times = self.lap_times[-count:] if len(self.lap_times) >= count else self.lap_times
        
        return {
            'count': len(recent_times),
            'total_time': round(sum(recent_times), 3),
            'average_time': round(sum(recent_times) / len(recent_times), 3),
            'best_time': round(min(recent_times), 3)
        }

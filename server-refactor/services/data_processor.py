"""
数据处理器 - 支持暂停/继续功能
负责处理UDP接收到的数据，计算速度和圈速，包含最近圈速和最佳圈速统计
支持暂停监测而不重置数据
"""

import logging
import time
from datetime import datetime
from typing import Optional, Dict, List
from config import settings

logger = logging.getLogger(__name__)


class DataProcessor:
    """数据处理器"""

    def __init__(self, websocket_manager):
        self.websocket_manager = websocket_manager
        self.is_monitoring = True  # 监测状态，默认开启
        self.lap_count_setting = 3  # 统计圈数设置，默认3圈
        self.reset_data()

    def reset_data(self):
        """重置数据"""
        self.is_first_data = True
        self.lap_count = 0
        self.total_time = 0.0
        self.last_data_time = None
        self.lap_times = []
        self.lap_details = []  # 存储每圈的详细信息
        logger.info("数据处理器已重置所有数据")

    def set_monitoring(self, is_monitoring: bool):
        """设置监测状态"""
        self.is_monitoring = is_monitoring
        status = "开启" if is_monitoring else "暂停"
        logger.info(f"监测状态已设置为：{status}")

    def set_lap_count(self, lap_count: int):
        """设置统计圈数"""
        if lap_count < 1 or lap_count > 10:
            logger.warning(f"无效的圈数设置: {lap_count}，保持当前设置: {self.lap_count_setting}")
            return False

        old_count = self.lap_count_setting
        self.lap_count_setting = lap_count
        logger.info(f"统计圈数已从 {old_count} 更新为 {lap_count}")
        return True

    async def process_udp_data(self, raw_data: str, addr: tuple):
        """处理UDP数据"""
        try:
            # 解析时间戳
            timestamp_ms = float(raw_data.strip())      # in milliseconds
            current_time = time.time_ns() // 1_000_000  # 当前时间戳(毫秒)

            logger.info("收到UDP数据: %s ms from %s, 监测状态: %s",
                       timestamp_ms, addr, "开启" if self.is_monitoring else "暂停")

            # 如果监测被暂停，不处理数据但记录日志
            if not self.is_monitoring:
                logger.info("监测已暂停，忽略UDP数据")
                return

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

        # 存储圈的详细信息
        lap_info = {
            'lap_number': self.lap_count,
            'lap_time': lap_time,
            'total_time': self.total_time,
            'timestamp': current_time
        }
        self.lap_details.append(lap_info)

        # 计算速度
        speed = self._calculate_speed(timestamp_ms)

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
            'laps_stats': self._get_laps_stats()  # 统计数据
        }

        # 发送数据给WebSocket客户端
        await self.websocket_manager.send_data(data_packet)

    def _calculate_lap_time(self, interval_ms: float, measurement_ms: float) -> float:
        """计算圈用时"""
        return (interval_ms + measurement_ms) / 1000  # time in seconds

    def _calculate_speed(self, measurement_ms: float) -> float:
        """
        计算速度
        measurement_ms: 测量时间（毫秒）
        return: 速度（米/秒）
        """
        if measurement_ms <= 0:
            return 0.0

        # 单位转换
        distance_m = settings.distance_l / 1000  # 毫米转米
        radius_r1_m = settings.radius_r1 / 100  # 厘米转米
        radius_r2_m = settings.radius_r2  # 已经是米
        measurement_s = measurement_ms / 1000  # 毫秒转秒

        # 计算速度
        speed_r1 = distance_m / measurement_s
        speed_r2 = (radius_r2_m / radius_r1_m) * speed_r1

        return speed_r2

    def _get_laps_stats(self, count: int = None) -> dict:
        """获取圈速统计信息"""
        # 使用设置的圈数，如果没有传入参数的话
        if count is None:
            count = self.lap_count_setting

        if len(self.lap_times) == 0:
            stats = {
                'best_laps': {'laps': '', 'total': 0},
                'recent_laps': {'laps': '', 'total': 0}
            }
            return stats

        # 创建包含圈号和用时的元组列表
        lap_times_with_number = [(i + 1, time) for i, time in enumerate(self.lap_times)]

        # 获取连续的最快count圈
        best_total = float('inf')
        best_continuous = None

        # 使用滑动窗口找出连续的最快圈
        if len(lap_times_with_number) >= count:
            for i in range(len(lap_times_with_number) - count + 1):
                window = lap_times_with_number[i:i + count]
                total = sum(time for _, time in window)
                if total < best_total:
                    best_total = total
                    best_continuous = window

        if best_continuous:
            best_total = round(best_total, 3)
            if count == 1:
                best_range = f"第{best_continuous[0][0]}圈"
            else:
                best_range = f"第{best_continuous[0][0]}-{best_continuous[-1][0]}圈"
        else:
            # 如果圈数不够count圈，就使用现有的所有圈
            if len(lap_times_with_number) == 0:
                best_range = ""
                best_total = 0
            elif len(lap_times_with_number) == 1:
                best_range = f"第{lap_times_with_number[0][0]}圈"
                best_total = round(lap_times_with_number[0][1], 3)
            else:
                # 当数据不足count圈时，显示实际的圈数范围
                actual_count = min(count, len(lap_times_with_number))
                if actual_count == 1:
                    best_range = f"第{lap_times_with_number[-1][0]}圈"
                    best_total = round(lap_times_with_number[-1][1], 3)
                else:
                    start_idx = len(lap_times_with_number) - actual_count
                    end_idx = len(lap_times_with_number) - 1
                    best_range = f"第{lap_times_with_number[start_idx][0]}-{lap_times_with_number[end_idx][0]}圈"
                    best_total = round(sum(time for _, time in lap_times_with_number[start_idx:]), 3)

        # 获取最近圈速
        recent_laps = lap_times_with_number[-count:] if len(lap_times_with_number) >= count else lap_times_with_number
        recent_total = round(sum(time for _, time in recent_laps), 3)

        if len(recent_laps) == 0:
            recent_range = ""
        elif len(recent_laps) == 1:
            recent_range = f"第{recent_laps[0][0]}圈"
        else:
            recent_range = f"第{recent_laps[0][0]}-{recent_laps[-1][0]}圈"

        stats = {
            'best_laps': {
                'laps': best_range,
                'total': best_total
            },
            'recent_laps': {
                'laps': recent_range,
                'total': recent_total
            },
            'setting': {
                'lap_count': count  # 添加当前设置的圈数
            }
        }

        return stats
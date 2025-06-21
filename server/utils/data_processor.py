"""
后端数据处理器（删除导出功能）
"""
import time
import json
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
import threading
import traceback
import sys
import gc


class DataProcessor:
    def __init__(self, websocket_server):
        self.websocket_server = websocket_server

        # 物理常量
        self.constants = {
            'L': 3,        # 距离
            'R1': 3.5 / 100,  # 半径1 (0.035)
            'R2': 15       # 半径2
        }

        # 数据处理相关变量
        self.lock = threading.Lock()
        self.reset_variables()

        # 设置相关（使用驼峰命名以匹配前端）
        self.settings = {
            'targetLaps': 3,
            'lapDisplayLimit': 1000,
            'debugDisplayLimit': 1000,
            'showDebugInfo': True
        }

        # 设置键名映射（前端驼峰 -> 后端理解）
        self.setting_key_map = {
            'targetLaps': 'targetLaps',
            'lapDisplayLimit': 'lapDisplayLimit',
            'debugDisplayLimit': 'debugDisplayLimit',
            'showDebugInfo': 'showDebugInfo',
            # 兼容可能的下划线命名
            'target_laps': 'targetLaps',
            'lap_display_limit': 'lapDisplayLimit',
            'debug_display_limit': 'debugDisplayLimit',
            'show_debug_info': 'showDebugInfo'
        }

        print(f"📐 物理常量初始化: L={self.constants['L']}, R1={self.constants['R1']}, R2={self.constants['R2']}")
        print(f"⚙️ 设置已初始化: {self.settings}")

    def normalize_setting_key(self, key: str) -> Optional[str]:
        """标准化设置键名"""
        return self.setting_key_map.get(key)

    def safe_float(self, value: Any, default: float = 0.0) -> float:
        """安全的浮点数转换"""
        try:
            if value is None:
                return default
            return float(value)
        except (ValueError, TypeError):
            return default

    def safe_int(self, value: Any, default: int = 0) -> int:
        """安全的整数转换"""
        try:
            if value is None:
                return default
            return int(value)
        except (ValueError, TypeError):
            return default

    def validate_numeric(self, value: Any, field_name: str) -> bool:
        """验证数值字段"""
        if value is None:
            print(f"❌ 字段 {field_name} 为 None")
            return False

        try:
            float_val = float(value)
            if not (float_val == float_val):  # 检查 NaN
                print(f"❌ 字段 {field_name} 为 NaN")
                return False
            if not (-float('inf') < float_val < float('inf')):  # 检查无穷大
                print(f"❌ 字段 {field_name} 为无穷大")
                return False
            return True
        except (ValueError, TypeError):
            print(f"❌ 字段 {field_name} 无法转换为数值: {value}")
            return False

    def reset_variables(self):
        """重置变量（但不清除UI）"""
        with self.lock:
            self.is_first_data = True
            self.lap_count = 0
            self.total_time = 0.0
            self.last_data_time = None
            self.lap_details = []
            self.lap_times = []
            self.velocity_data = []

    def reset_lap_data_only(self):
        """仅重置圈数据，保持数据接收状态"""
        with self.lock:
            # 保存当前的数据接收状态
            preserve_first_data = self.is_first_data
            preserve_last_time = self.last_data_time

            # 重置圈数据
            self.lap_count = 0
            self.total_time = 0.0
            self.lap_details = []
            self.lap_times = []
            self.velocity_data = []

            # 如果已经在正常接收数据（不是首次），保持这个状态
            if not preserve_first_data and preserve_last_time is not None:
                self.is_first_data = False
                self.last_data_time = preserve_last_time
                print("🔄 仅重置圈数据，保持数据接收状态")
            else:
                # 如果还没开始接收数据，完全重置
                self.is_first_data = True
                self.last_data_time = None
                print("🔄 完全重置数据接收状态")

    def process_udp_data(self, udp_packet: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        处理UDP数据包
        """
        try:
            print(f"🔍 Debug: 收到UDP数据包: {udp_packet}")

            current_time = time.time() * 1000  # 转换为毫秒

            # 安全解析数据
            raw_data = udp_packet.get('data', '')
            if not raw_data:
                print("❌ UDP数据包缺少data字段")
                return None

            t = self.safe_float(raw_data)
            print(f"🔍 Debug: 解析的时间值 t = {t}")

            if not self.validate_numeric(t, 't'):
                print(f"❌ 无效的时间数据: {raw_data}")
                return None

            if t <= 0:
                print(f"❌ 时间数据必须大于0: {t}")
                return None

            with self.lock:
                print(f"🔍 Debug: 当前状态 - is_first_data: {self.is_first_data}, last_data_time: {self.last_data_time}")

                # 处理首次数据
                if self.is_first_data:
                    return self._handle_first_data(t, current_time, udp_packet)

                # 处理正常圈数数据
                return self._process_lap_data(t, current_time, udp_packet)

        except Exception as e:
            print(f"❌ 数据处理异常: {e}")
            print(f"❌ 异常详情: {traceback.format_exc()}")
            return self._create_error_response(str(e))

    def _create_error_response(self, error_message: str) -> Dict[str, Any]:
        """创建错误响应"""
        response = {
            'type': 'debug',
            'message': f'数据处理错误: {error_message}',
            'timestamp': datetime.now().isoformat(),
            'error': True
        }
        print(f"🔍 Debug: 创建错误响应: {response}")
        return response

    def _handle_first_data(self, t: float, current_time: float, udp_packet: Dict[str, Any]) -> Dict[str, Any]:
        """处理首次数据"""
        self.is_first_data = False
        self.last_data_time = current_time

        debug_info = f"首次数据 t={t:.3f}ms，仅用于初始化时间基准，不计入圈数"
        print(debug_info)

        response = {
            'type': 'debug',
            'message': debug_info,
            'timestamp': datetime.now().isoformat()
        }
        print(f"🔍 Debug: 首次数据响应: {response}")
        return response

    def _process_lap_data(self, t: float, current_time: float, udp_packet: Dict[str, Any]) -> Dict[str, Any]:
        """处理圈数数据"""
        try:
            print(f"🔍 Debug: 开始处理圈数据, t={t}, current_time={current_time}")

            # 计算时间间隔
            if self.last_data_time is None:
                print("❌ 上次数据时间未设置")
                return self._create_error_response("上次数据时间未设置")

            interval = current_time - self.last_data_time
            self.last_data_time = current_time
            self.lap_count += 1

            print(f"🔍 Debug: 圈数={self.lap_count}, 间隔={interval:.3f}ms")

            # 计算圈用时
            lap_time = self._calculate_lap_time(interval, t)
            if not self.validate_numeric(lap_time, 'lap_time'):
                return self._create_error_response("圈用时计算错误")

            self.total_time += lap_time
            self.lap_times.append(lap_time)

            print(f"🔍 Debug: 圈用时={lap_time:.3f}ms, 总时间={self.total_time:.3f}ms")

            # 添加圈详情
            lap_detail = {
                'lap': self.lap_count,
                'lapTime': lap_time,  # 使用驼峰命名
                'timestamp': current_time,
                'measurement': t,
                'interval': interval
            }
            self.lap_details.append(lap_detail)

            print(f"第{self.lap_count}圈完成，用时: {lap_time:.3f}ms")

            # 限制存储的数据量
            self._limit_data_storage()

            # 计算速度
            velocity_data = self._calculate_velocity(t, current_time)
            if velocity_data:
                self.velocity_data.append(velocity_data)
                print(f"🔍 Debug: 速度数据: {velocity_data}")

            # 获取统计数据
            lap_info = self._get_current_lap_info()
            recent_stats = self._get_recent_laps_stats()

            print(f"🔍 Debug: lap_info keys: {lap_info.keys()}")
            print(f"🔍 Debug: recent_stats keys: {recent_stats.keys()}")

            # 构造返回数据（确保所有字段都存在且使用驼峰命名）
            response_data = {
                'type': 'lap_data',
                'lapCount': self.safe_int(self.lap_count),
                'lapTime': self.safe_float(lap_time),
                'totalTime': self.safe_float(self.total_time),
                'velocity': velocity_data,
                'lapInfo': lap_info,
                'recentStats': recent_stats,
                'showStatsSection': self.lap_count >= self.settings['targetLaps'],
                'timestamp': datetime.now().isoformat()
            }

            print(f"🔍 Debug: 准备发送的响应数据:")
            print(f"🔍 Debug: - type: {response_data['type']}")
            print(f"🔍 Debug: - lapCount: {response_data['lapCount']}")
            print(f"🔍 Debug: - totalTime: {response_data['totalTime']}")
            print(f"🔍 Debug: - lapTime: {response_data['lapTime']}")
            print(f"🔍 Debug: - showStatsSection: {response_data['showStatsSection']}")

            return response_data

        except Exception as e:
            print(f"❌ 处理圈数据异常: {e}")
            print(f"❌ 异常详情: {traceback.format_exc()}")
            return self._create_error_response(f"处理圈数据异常: {str(e)}")

    def _calculate_lap_time(self, interval: float, measurement: float) -> float:
        """计算圈用时"""
        # 每圈总用时 = 间隔时间 + 测量值
        lap_time = self.safe_float(interval) + self.safe_float(measurement)
        print(f"🔍 Debug: 计算圈用时: {interval} + {measurement} = {lap_time}")
        return lap_time

    def _calculate_velocity(self, t: float, current_time: float) -> Optional[Dict[str, Any]]:
        """计算速度"""
        try:
            if not self.validate_numeric(t, 't'):
                return None

            t_safe = self.safe_float(t)
            if t_safe <= 0:
                print(f"❌ 时间必须大于0: {t_safe}")
                return None

            v1 = self.constants['L'] / t_safe
            v2 = (v1 * self.constants['R2']) / self.constants['R1']

            # 验证计算结果
            if not (self.validate_numeric(v1, 'v1') and self.validate_numeric(v2, 'v2')):
                print(f"❌ 速度计算结果无效: v1={v1}, v2={v2}")
                return None

            velocity_data = {
                'timestamp': self.safe_float(current_time),
                'time': datetime.fromtimestamp(current_time / 1000).strftime('%H:%M:%S'),
                't': self.safe_float(t_safe),
                'v1': self.safe_float(v1),
                'v2': self.safe_float(v2)
            }

            print(f"✅ 计算结果: t={t_safe:.3f}, v1={v1:.4f}, v2={v2:.2f}")
            return velocity_data

        except Exception as e:
            print(f"❌ 速度计算异常: {e}")
            print(f"❌ 异常详情: {traceback.format_exc()}")
            return None

    def _limit_data_storage(self):
        """限制数据存储量"""
        try:
            lap_display_limit = self.safe_int(self.settings.get('lapDisplayLimit', 1000))

            if len(self.lap_details) > lap_display_limit * 2:
                self.lap_details = self.lap_details[-lap_display_limit:]

            if len(self.velocity_data) > 100:
                self.velocity_data = self.velocity_data[-100:]
        except Exception as e:
            print(f"❌ 限制数据存储异常: {e}")

    def _get_current_lap_info(self) -> Dict[str, Any]:
        """获取当前圈数信息"""
        try:
            lap_display_limit = self.safe_int(self.settings.get('lapDisplayLimit', 1000))

            lap_info = {
                'currentLap': self.safe_int(self.lap_count),
                'totalTime': self.safe_float(self.total_time),
                'targetLaps': self.safe_int(self.settings.get('targetLaps', 3)),
                'lapDetails': self.lap_details[-lap_display_limit:] if self.lap_details else [],
                'showStatsSection': self.lap_count >= self.settings.get('targetLaps', 3)
            }

            print(f"🔍 Debug: lap_info 内容: {lap_info}")
            return lap_info

        except Exception as e:
            print(f"❌ 获取圈数信息异常: {e}")
            return {
                'currentLap': 0,
                'totalTime': 0.0,
                'targetLaps': 3,
                'lapDetails': [],
                'showStatsSection': False
            }

    def _get_recent_laps_stats(self) -> Dict[str, Any]:
        """获取近n圈统计"""
        try:
            target_laps = self.safe_int(self.settings.get('targetLaps', 3))
            n = target_laps

            default_stats = {
                'targetLaps': n,
                'recentTotal': 0.0,
                'bestTime': 0.0,
                'recentCombinations': [],
                'hasEnoughData': False
            }

            if len(self.lap_times) == 0:
                print(f"🔍 Debug: 没有圈时间数据，返回默认统计")
                return default_stats

            has_enough_data = len(self.lap_times) >= n
            recent_total = 0.0
            best_time = float('inf')
            recent_combinations = []

            print(f"🔍 Debug: 圈时间数据数量: {len(self.lap_times)}, 需要: {n}, 足够数据: {has_enough_data}")

            if has_enough_data:
                # 计算所有n圈组合
                for i in range(len(self.lap_times) - n + 1):
                    combo_times = self.lap_times[i:i + n]
                    combo_total = sum(self.safe_float(time) for time in combo_times)

                    recent_combinations.append({
                        'startLap': i + 1,
                        'endLap': i + n,
                        'totalTime': self.safe_float(combo_total),
                        'isBest': False  # 稍后标记
                    })

                    if combo_total < best_time:
                        best_time = combo_total

                # 标记最佳组合
                for combo in recent_combinations:
                    combo['isBest'] = abs(combo['totalTime'] - best_time) < 0.001  # 浮点数比较

                # 获取最近n圈的总时间
                recent_laps = self.lap_times[-n:]
                recent_total = sum(self.safe_float(time) for time in recent_laps)

            recent_stats = {
                'targetLaps': n,
                'recentTotal': self.safe_float(recent_total),
                'bestTime': self.safe_float(best_time) if best_time != float('inf') else 0.0,
                'recentCombinations': recent_combinations,
                'hasEnoughData': has_enough_data
            }

            print(f"🔍 Debug: recent_stats 内容: {recent_stats}")
            return recent_stats

        except Exception as e:
            print(f"❌ 获取近n圈统计异常: {e}")
            print(f"❌ 异常详情: {traceback.format_exc()}")
            return {
                'targetLaps': 3,
                'recentTotal': 0.0,
                'bestTime': 0.0,
                'recentCombinations': [],
                'hasEnoughData': False
            }

    def reset_lap_data(self) -> Dict[str, Any]:
        """重置圈数据（用户主动重置时使用）"""
        try:
            print('🔄 用户主动重置所有数据')
            self.reset_variables()  # 完全重置，包括首次数据标志

            response = {
                'type': 'data_reset',
                'message': '数据已重置',
                'timestamp': datetime.now().isoformat()
            }
            print(f"🔍 Debug: 重置响应: {response}")
            return response

        except Exception as e:
            print(f"❌ 重置数据异常: {e}")
            return self._create_error_response(f"重置数据异常: {str(e)}")

    def update_setting(self, key: str, value: Any) -> bool:
        """更新设置"""
        try:
            print(f"🔍 Debug: 收到设置更新请求: key={key}, value={value}")

            # 标准化键名
            normalized_key = self.normalize_setting_key(key)
            if not normalized_key:
                print(f"❌ 未知的设置键: {key}")
                print(f"💡 可用的设置键: {list(self.settings.keys())}")
                print(f"💡 键名映射: {self.setting_key_map}")
                return False

            old_value = self.settings[normalized_key]

            # 根据设置类型进行安全转换
            if isinstance(old_value, int):
                self.settings[normalized_key] = self.safe_int(value)
            elif isinstance(old_value, float):
                self.settings[normalized_key] = self.safe_float(value)
            elif isinstance(old_value, bool):
                self.settings[normalized_key] = bool(value)
            else:
                self.settings[normalized_key] = value

            print(f"⚙️ 设置已更新: {normalized_key} = {self.settings[normalized_key]} (原值: {old_value})")

            # 🔧 修复bug：目标圈数变更时，仅重置圈数据，不影响数据接收状态
            if normalized_key == 'targetLaps':
                print("🔧 目标圈数已变更，仅重置圈数据（保持数据接收状态）")
                self.reset_lap_data_only()  # 使用新的方法，不会破坏数据接收流程

            return True

        except Exception as e:
            print(f"❌ 更新设置异常: {e}")
            print(f"❌ 异常详情: {traceback.format_exc()}")
            return False

    def get_setting(self, key: str) -> Any:
        """获取设置值"""
        normalized_key = self.normalize_setting_key(key)
        if normalized_key:
            return self.settings.get(normalized_key)
        return None

    def get_all_settings(self) -> Dict[str, Any]:
        """获取所有设置"""
        return self.settings.copy()

    def get_stats_summary(self) -> Optional[Dict[str, Any]]:
        """获取统计摘要"""
        try:
            with self.lock:
                if len(self.lap_times) == 0:
                    return None

                safe_lap_times = [self.safe_float(t) for t in self.lap_times]
                avg_lap_time = sum(safe_lap_times) / len(safe_lap_times)
                fastest_lap = min(safe_lap_times)
                slowest_lap = max(safe_lap_times)

                return {
                    'totalLaps': self.safe_int(self.lap_count),
                    'totalTime': self.safe_float(self.total_time),
                    'avgLapTime': self.safe_float(avg_lap_time),
                    'fastestLap': self.safe_float(fastest_lap),
                    'slowestLap': self.safe_float(slowest_lap),
                    'lapTimes': safe_lap_times,
                    'velocityDataPoints': len(self.velocity_data)
                }
        except Exception as e:
            print(f"❌ 获取统计摘要异常: {e}")
            return None

    def get_memory_usage(self) -> Dict[str, Any]:
        """获取内存使用情况"""
        try:
            import psutil
            import os

            process = psutil.Process(os.getpid())
            memory_info = process.memory_info()

            return {
                'rss_mb': round(memory_info.rss / 1024 / 1024, 2),
                'vms_mb': round(memory_info.vms / 1024 / 1024, 2),
                'cpu_percent': process.cpu_percent(),
                'lap_details_count': len(self.lap_details),
                'velocity_data_count': len(self.velocity_data)
            }
        except ImportError:
            return {
                'lap_details_count': len(self.lap_details),
                'velocity_data_count': len(self.velocity_data),
                'message': 'psutil not available for detailed memory stats'
            }
        except Exception as e:
            return {'error': str(e)}
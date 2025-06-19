#!/usr/bin/env python3
"""
UDP模拟数据发送器
用于发送模拟的时间戳数据
"""

import socket
import time
import random


def send_mock_timestamps():
    # 创建UDP客户端socket
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    # 服务器地址
    server_address = ('127.0.0.1', 8888)

    try:
        print("开始发送模拟时间数据...")

        while True:
            # 生成当前时间（毫秒）
            current_time_ms = random.uniform(40, 100)

            # 发送时间戳
            message = str(current_time_ms)
            client_socket.sendto(message.encode('utf-8'), server_address)
            print(f"已发送时间戳: {message}")

            # 随机延迟0.85-1.25秒
            delay = random.uniform(0.850, 1.250)
            time.sleep(delay)

    except KeyboardInterrupt:
        print("\n检测到退出信号，停止发送")
    except Exception as e:
        print(f"发送数据时发生错误: {e}")
    finally:
        client_socket.close()
        print("UDP客户端已关闭")


if __name__ == "__main__":
    send_mock_timestamps()
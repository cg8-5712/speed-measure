#!/usr/bin/env python3
"""
UDP测试脚本 - 用于测试重构版系统
发送模拟的时间戳数据到UDP服务器
"""

import socket
import time
import random
import json


def send_test_data():
    """发送测试数据到UDP服务器"""
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server_address = ('127.0.0.1', 8888)
    
    print("🚀 开始发送测试数据到重构版服务器...")
    print(f"📡 目标服务器: {server_address[0]}:{server_address[1]}")
    print("⏸️  按 Ctrl+C 停止发送\n")

    try:
        lap_count = 0
        while True:
            lap_count += 1
            
            # 生成模拟时间戳(90-120毫秒)
            timestamp_ms = random.uniform(90, 120)
            
            # 发送数据
            message = str(timestamp_ms)
            client_socket.sendto(message.encode('utf-8'), server_address)
            
            print(f"📊 第{lap_count}圈 - 发送时间戳: {timestamp_ms:.3f}ms")
            
            # 随机延迟(模拟真实场景)
            delay = random.uniform(0.8, 1.5)
            time.sleep(delay)
            
    except KeyboardInterrupt:
        print("\n🛑 检测到停止信号")
    except Exception as e:
        print(f"❌ 发送数据时发生错误: {e}")
    finally:
        client_socket.close()
        print("✅ UDP客户端已关闭")


if __name__ == "__main__":
    send_test_data()

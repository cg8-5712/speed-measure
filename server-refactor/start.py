#!/usr/bin/env python3
"""
启动脚本
"""

import subprocess
import sys
import os

def install_dependencies():
    """安装依赖"""
    print("正在安装依赖...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

def start_server():
    """启动服务器"""
    print("启动速度监测系统...")
    os.system("python main.py")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--install":
        install_dependencies()
    else:
        start_server()

"""
速度监测系统 - 重构版本
使用FastAPI + WebSocket + UDP的简化架构
"""

import json
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn

from config import settings
from services.udp_server import UDPServer
from services.data_processor import DataProcessor
from services.websocket_manager import WebSocketManager

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 全局变量
udp_server = None
websocket_manager = None
data_processor = None


async def handle_websocket_message(message: dict, _: WebSocket):
    """处理WebSocket消息"""
    message_type = message.get('type')

    if message_type == 'reset_data':
        # 重置后端数据
        if data_processor:
            data_processor.reset_data()
            logger.info("后端数据已重置")

            # 发送确认消息给客户端
            await websocket_manager.send_data({
                'type': 'reset_confirm',
                'message': '后端数据已重置，从第0圈开始',
                'timestamp': time.time() * 1000
            })
    else:
        logger.warning("未知的消息类型: %s", message_type)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global udp_server, websocket_manager, data_processor

    # 启动时初始化
    logger.info("启动速度监测系统...")

    # 创建服务实例
    websocket_manager = WebSocketManager()
    data_processor = DataProcessor(websocket_manager)
    udp_server = UDPServer(data_processor)

    # 启动UDP服务器
    await udp_server.start()
    logger.info(f"UDP服务器启动在 {settings.udp_host}:{settings.udp_port}")

    yield

    # 关闭时清理
    logger.info("关闭速度监测系统...")
    if udp_server:
        await udp_server.stop()


# 创建FastAPI应用
app = FastAPI(
    title="速度监测系统",
    description="基于ESP8266和光传感器的实时速度监测",
    version="2.0.0",
    lifespan=lifespan
)

# 挂载静态文件
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", response_class=HTMLResponse)
async def read_root():
    """主页面"""
    try:
        with open("static/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="<h1>页面未找到</h1><p>请确保static/index.html文件存在</p>")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket连接端点"""
    await websocket_manager.connect(websocket)
    try:
        while True:
            # 接收客户端消息
            data = await websocket.receive_text()
            logger.info("收到客户端消息: %s", data)

            try:
                message = json.loads(data)
                await handle_websocket_message(message, websocket)
            except json.JSONDecodeError:
                logger.error("无法解析客户端消息: %s", data)

    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
        logger.info("客户端断开连接")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )

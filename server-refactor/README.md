# 速度监测系统 - 重构版

## 🚀 快速开始

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 启动服务器
```bash
python main.py
```

### 3. 访问系统
打开浏览器访问: http://localhost:8000

## 📋 系统架构

### 简化的架构设计
```
ESP8266 → UDP(8888) → FastAPI → WebSocket → 前端
```

### 核心组件
- **main.py**: FastAPI主应用，WebSocket服务
- **services/udp_server.py**: UDP数据接收服务
- **services/data_processor.py**: 数据处理和计算
- **services/websocket_manager.py**: WebSocket连接管理
- **static/**: 前端文件(HTML, CSS, JS)

## 🔧 配置说明

### config.py
```python
# 服务器配置
host = "0.0.0.0"          # 服务器地址
port = 8000               # HTTP端口

# UDP配置  
udp_host = "0.0.0.0"      # UDP监听地址
udp_port = 8888           # UDP端口

# 物理常量
distance_l = 3.0          # 测量距离(米)
radius_r1 = 0.035         # 半径1
radius_r2 = 15.0          # 半径2
```

## 📊 数据流程

1. **ESP8266发送UDP数据**: 时间戳(毫秒)
2. **UDP服务器接收**: 解析数据并传递给数据处理器  
3. **数据处理**: 计算圈速、速度等统计信息
4. **WebSocket广播**: 实时推送给前端
5. **前端展示**: 更新图表和统计数据

## 🎯 功能特性

### 实时监控
- ✅ 实时圈数统计
- ✅ 速度计算和显示
- ✅ 最快圈速记录
- ✅ 动态图表展示

### 用户界面
- ✅ 现代化响应式设计
- ✅ 实时连接状态显示
- ✅ 圈速详情列表
- ✅ 调试信息输出

### 系统功能
- ✅ 自动重连机制
- ✅ 数据重置功能
- ✅ 错误处理和日志
- ✅ 高性能异步处理

## 🔍 API接口

### WebSocket
- **连接地址**: `ws://localhost:8000/ws`
- **数据格式**: JSON

### REST API
- **系统状态**: `GET /api/status`

## 🛠️ 开发说明

### 本地开发
```bash
# 开发模式启动(自动重载)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 测试UDP数据发送
可以使用原项目的 `mock-send.py` 来测试:
```bash
python ../server/mock-send.py
```

## 📈 性能优化

- 使用FastAPI异步框架，性能比Flask提升显著
- WebSocket连接池管理，支持多客户端
- 前端数据限制和图表优化
- 内存中数据处理，无数据库IO开销

## 🔄 与原版本对比

| 功能 | 原版本 | 重构版 |
|------|--------|--------|
| 服务器架构 | Flask+自制WebSocket+UDP | FastAPI+内置WebSocket+UDP |
| 代码复杂度 | 高(6个JS模块) | 低(单文件) |
| 性能 | 中等 | 高 |
| 维护性 | 差 | 好 |
| 代码量 | 大 | 小(-60%) |

## 🐛 故障排除

### 常见问题
1. **端口占用**: 检查8000和8888端口是否被占用
2. **依赖安装失败**: 确保Python版本>=3.8
3. **WebSocket连接失败**: 检查防火墙设置

### 日志查看
系统会在控制台输出详细的运行日志，包括:
- UDP数据接收情况
- WebSocket连接状态  
- 数据处理过程
- 错误信息

## 📝 TODO

- [ ] 添加数据持久化(可选)
- [ ] 支持多设备连接
- [ ] 添加数据导出功能
- [ ] 移动端适配优化
- [ ] 添加系统监控面板

---

**重构版本大幅简化了系统架构，提高了性能和可维护性，同时保持了所有核心功能。**

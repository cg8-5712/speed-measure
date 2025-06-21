# 速度监测系统 - 模块化项目结构

## 📁 项目目录结构

```
static/
├── index.html                          # 主页面文件
├── css/
│   └── styles.css                       # 样式文件
├── js/
│   ├── main.js                          # 主入口文件
│   └── modules/                         # 模块目录
│       ├── websocketManager.js          # WebSocket连接管理
│       ├── settingsManager.js           # 设置管理
│       ├── dataProcessor.js             # 数据处理
│       ├── uiManager.js                 # UI界面管理
│       ├── chartManager.js              # 图表管理
│       └── debugManager.js              # 调试信息管理
└── structer.md                            # 项目说明文档
```

## 🏗️ 架构设计

### 模块化原则
- **单一职责**: 每个模块只负责一个特定的功能域
- **松耦合**: 模块间通过定义好的接口进行通信
- **高内聚**: 相关功能集中在同一模块内
- **可扩展**: 易于添加新功能和模块

### 依赖关系图
```
main.js (应用入口)
├── WebSocketManager (WebSocket连接)
├── SettingsManager (设置管理)
├── DataProcessor (数据处理) 
│   ├── 依赖: SettingsManager
│   ├── 依赖: UIManager  
│   └── 依赖: DebugManager
├── UIManager (界面管理)
├── ChartManager (图表管理)
└── DebugManager (调试管理)
```

## 📋 模块详细说明

### 1. 主入口模块 (main.js)
**职责**: 应用程序的启动和模块间协调
- 初始化所有管理器
- 绑定全局事件监听器
- 处理模块间通信
- 管理应用生命周期

**主要功能**:
```javascript
class SpeedMonitorApp {
    initializeManagers()     // 初始化各个管理器
    bindEvents()            // 绑定事件监听器
    initializeApp()         // 初始化应用程序
    cleanup()               // 清理资源
}
```

### 2. WebSocket管理器 (websocketManager.js)
**职责**: 处理所有WebSocket相关操作
- 建立和维护WebSocket连接
- 自动重连机制
- 消息发送和接收
- 连接状态管理

**主要功能**:
```javascript
class WebSocketManager {
    startConnection()       // 启动连接
    stopConnection()        // 停止连接
    connectWebSocket()      // 建立连接
    handleMessage()         // 处理消息
    scheduleReconnect()     // 计划重连
}
```

### 3. 设置管理器 (settingsManager.js)
**职责**: 管理应用程序配置和用户偏好
- 加载和保存设置
- 设置界面管理
- 配置变更通知
- 导入导出设置

**主要功能**:
```javascript
class SettingsManager {
    loadSettings()          // 加载设置
    saveSettings()          // 保存设置  
    updateSetting()         // 更新设置
    onSettingChange()       // 设置变更回调
    exportSettings()        // 导出设置
}
```

### 4. 数据处理器 (dataProcessor.js)
**职责**: 处理速度数据的计算和统计
- 圈速数据处理
- 速度计算
- 统计信息生成
- 数据验证和过滤

**主要功能**:
```javascript
class DataProcessor {
    processData()           // 处理数据
    calculateVelocity()     // 计算速度
    getRecentLapsStats()    // 获取统计
    resetLapData()          // 重置数据
    exportData()            // 导出数据
}
```

### 5. UI管理器 (uiManager.js)
**职责**: 管理用户界面的更新和交互
- DOM元素更新
- 状态显示管理
- 消息提示
- 界面状态控制

**主要功能**:
```javascript
class UIManager {
    updateStatus()          // 更新状态
    updateLapInfo()         // 更新圈数信息
    showMessage()           // 显示消息
    updateControlButtons()  // 更新按钮状态
    toggleElement()         // 切换元素显示
}
```

### 6. 图表管理器 (chartManager.js)
**职责**: 管理Chart.js图表的显示和更新
- 图表初始化
- 数据可视化
- 图表主题管理
- 图表导出功能

**主要功能**:
```javascript
class ChartManager {
    initialize()            // 初始化图表
    updateChart()           // 更新图表数据
    clearChart()            // 清空图表
    exportChart()           // 导出图表
    updateTheme()           // 更新主题
}
```

### 7. 调试管理器 (debugManager.js)
**职责**: 管理调试信息的记录和显示
- 调试信息记录
- 日志级别管理
- 调试面板显示
- 日志导出功能

**主要功能**:
```javascript
class DebugManager {
    addDebugInfo()          // 添加调试信息
    setLogLevel()           // 设置日志级别
    exportLogs()            // 导出日志
    clearDebugInfo()        // 清空调试信息
    getStats()              // 获取统计
}
```

## 🔄 数据流

### 数据处理流程
```
WebSocket接收数据 → DataProcessor处理 → UIManager更新界面
                                     ↓
                               ChartManager更新图表
                                     ↓
                               DebugManager记录日志
```

### 设置管理流程
```
用户修改设置 → SettingsManager处理 → 通知相关模块 → 更新应用行为
```

### 事件通信流程
```
模块A触发事件 → 事件系统 → 模块B接收事件 → 执行相应操作
```

## 🚀 使用方式

### 基本部署
1. 将所有文件按目录结构放置到Web服务器
2. 确保WebSocket服务运行在 `ws://127.0.0.1:8080`
3. 访问 `index.html` 启动应用

### 开发模式
```javascript
// 在浏览器控制台可访问应用实例
window.speedMonitorApp.getVersion()
window.speedMonitorApp.debugManager.setLogLevel('debug')
```

### 自定义配置
通过设置管理器可以调整：
- 目标圈数
- 显示限制
- 调试选项
- 界面主题

## 📈 扩展指南

### 添加新模块
1. 在 `js/modules/` 目录创建新模块文件
2. 实现模块类并导出
3. 在 `main.js` 中导入和初始化
4. 添加必要的事件监听和通信

### 模块接口规范
```javascript
export class NewManager {
    constructor(dependencies) {
        // 初始化依赖
    }
    
    initialize() {
        // 模块初始化逻辑
    }
    
    cleanup() {
        // 资源清理逻辑
    }
}
```

### 事件通信
使用发布-订阅模式进行模块间通信：
```javascript
// 发布事件
this.triggerEvent('eventName', data);

// 订阅事件  
this.on('eventName', callback);
```

## 🛠️ 维护建议

### 代码质量
- 保持模块的单一职责
- 添加适当的错误处理
- 编写清晰的注释和文档
- 定期重构和优化代码

### 性能优化
- 限制数据存储量
- 使用节流和防抖
- 优化DOM操作
- 监控内存使用

### 测试策略
- 单元测试每个模块
- 集成测试模块间交互
- 端到端测试完整流程
- 性能测试关键路径

## 📊 技术栈

- **前端框架**: 原生JavaScript (ES6+)
- **图表库**: Chart.js
- **样式**: CSS3 + Flexbox/Grid
- **模块系统**: ES6 Modules
- **通信协议**: WebSocket
- **数据存储**: LocalStorage

## 🔧 工具支持

### 开发工具
- 现代浏览器的开发者工具
- VS Code 等编辑器
- Live Server 等本地服务器

### 调试功能
- 内置调试面板
- 控制台日志输出
- 性能监控
- 错误追踪

---

*该项目采用模块化架构设计，便于维护、扩展和团队协作开发。*
/**
 * WebSocket连接管理器（更新版）
 * 负责WebSocket连接的建立、维护、重连和消息处理
 * 支持双向通信：接收后端处理的数据，发送前端请求到后端
 */
export class WebSocketManager {
    constructor(dataProcessor, uiManager, debugManager) {
        this.dataProcessor = dataProcessor;
        this.uiManager = uiManager;
        this.debugManager = debugManager;

        // WebSocket相关属性
        this.ws = null;
        this.isConnecting = false;
        this.shouldConnect = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000; // 3秒重连间隔

        // WebSocket服务器地址
        this.serverUrl = 'ws://127.0.0.1:8080';

        // 监听数据处理器的发送事件
        this.dataProcessor.on('sendToBackend', (message) => {
            this.sendMessage(message);
        });
    }

    /**
     * 启动WebSocket连接
     */
    startConnection() {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            this.debugManager.addDebugInfo('⚠️ 连接已存在或正在连接中');
            return;
        }

        this.shouldConnect = true;
        this.reconnectAttempts = 0;
        this.uiManager.updateControlButtons('connecting');
        this.connectWebSocket();
    }

    /**
     * 停止WebSocket连接
     */
    stopConnection() {
        this.shouldConnect = false;

        if (this.ws) {
            try {
                this.ws.close();
            } catch (e) {
                console.error('关闭连接错误：', e);
            } finally {
                this.ws = null;
            }
        }

        this.uiManager.updateControlButtons('disconnected');
        this.uiManager.updateStatus('已断开连接', false);
        this.debugManager.addDebugInfo('🔴 用户手动断开连接');
    }

    /**
     * 建立WebSocket连接
     */
    connectWebSocket() {
        if (!this.shouldConnect || this.isConnecting) {
            return;
        }

        this.isConnecting = true;
        this.debugManager.addDebugInfo('🔄 尝试连接WebSocket...');

        try {
            this.ws = new WebSocket(this.serverUrl);
            this.setupEventHandlers();
        } catch (error) {
            this.isConnecting = false;
            this.debugManager.addDebugInfo(`❌ 连接创建失败: ${error.message}`);
            if (this.shouldConnect) {
                this.scheduleReconnect();
            }
        }
    }

    /**
     * 设置WebSocket事件处理器
     */
    setupEventHandlers() {
        this.ws.onopen = () => this.handleOpen();
        this.ws.onmessage = (event) => this.handleMessage(event);
        this.ws.onerror = (error) => this.handleError(error);
        this.ws.onclose = (event) => this.handleClose(event);
    }

    /**
     * 处理连接打开事件
     */
    handleOpen() {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.uiManager.updateStatus('已连接', true);
        this.uiManager.updateControlButtons('connected');
        this.debugManager.addDebugInfo('✅ WebSocket连接成功（后端数据处理模式）');
    }

    /**
     * 处理接收到的消息（来自后端的已处理数据）
     */
    handleMessage(event) {
        try {
            this.debugManager.addDebugInfo(`📥 接收到后端消息: "${event.data}"`);

            const cleanData = event.data.toString().trim();
            const jsonData = JSON.parse(cleanData);

            this.debugManager.addDebugInfo(`📋 解析的后端数据: ${JSON.stringify(jsonData)}`);

            // 将后端处理好的数据传递给前端数据处理器
            this.dataProcessor.processBackendData(jsonData);

        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 解析后端消息错误: ${error.message}`);
        }
    }

    /**
     * 处理连接错误事件
     */
    handleError(error) {
        this.isConnecting = false;
        this.uiManager.updateStatus('连接错误', false);
        this.debugManager.addDebugInfo(`❌ WebSocket错误: ${error}`);
        console.error('WebSocket错误:', error);

        if (this.shouldConnect) {
            this.scheduleReconnect();
        }
    }

    /**
     * 处理连接关闭事件
     */
    handleClose(event) {
        this.isConnecting = false;

        if (this.shouldConnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.uiManager.updateStatus('连接已断开，准备重连', false);
            this.debugManager.addDebugInfo(
                `WebSocket连接已关闭 (代码: ${event.code})，${this.reconnectInterval/1000}秒后重连...`
            );
            this.scheduleReconnect();
        } else if (this.shouldConnect) {
            this.uiManager.updateStatus('连接失败，已停止重连', false);
            this.uiManager.updateControlButtons('disconnected');
            this.shouldConnect = false;
            this.debugManager.addDebugInfo(
                `❌ 重连尝试已达到最大次数(${this.maxReconnectAttempts})，停止重连`
            );
        } else {
            this.uiManager.updateStatus('连接已关闭', false);
            this.debugManager.addDebugInfo(`WebSocket连接已关闭 (代码: ${event.code})`);
        }
    }

    /**
     * 计划重连
     */
    scheduleReconnect() {
        if (!this.shouldConnect) return;

        this.reconnectAttempts++;
        this.uiManager.updateControlButtons('connecting');

        setTimeout(() => {
            if (this.shouldConnect && this.reconnectAttempts <= this.maxReconnectAttempts) {
                this.debugManager.addDebugInfo(`🔄 第${this.reconnectAttempts}次重连尝试...`);
                this.connectWebSocket();
            }
        }, this.reconnectInterval);
    }

    /**
     * 发送消息到WebSocket服务器（后端）
     */
    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
                this.ws.send(messageStr);
                this.debugManager.addDebugInfo(`📤 发送消息到后端: ${messageStr}`);
                return true;
            } catch (error) {
                this.debugManager.addDebugInfo(`❌ 发送消息失败: ${error.message}`);
                return false;
            }
        } else {
            this.debugManager.addDebugInfo('❌ WebSocket未连接，无法发送消息');
            return false;
        }
    }

    /**
     * 发送设置更新到后端
     */
    sendSettingUpdate(key, value) {
        return this.sendMessage({
            type: 'setting_update',
            key: key,
            value: value
        });
    }

    /**
     * 请求重置数据
     */
    requestDataReset() {
        return this.sendMessage({
            type: 'reset_data'
        });
    }

    /**
     * 请求导出数据
     */
    requestDataExport() {
        return this.sendMessage({
            type: 'export_data'
        });
    }

    /**
     * 请求统计数据
     */
    requestStats() {
        return this.sendMessage({
            type: 'get_stats'
        });
    }

    /**
     * 获取连接状态
     */
    getConnectionState() {
        if (!this.ws) return 'CLOSED';

        switch (this.ws.readyState) {
            case WebSocket.CONNECTING:
                return 'CONNECTING';
            case WebSocket.OPEN:
                return 'OPEN';
            case WebSocket.CLOSING:
                return 'CLOSING';
            case WebSocket.CLOSED:
                return 'CLOSED';
            default:
                return 'UNKNOWN';
        }
    }

    /**
     * 设置服务器URL
     */
    setServerUrl(url) {
        this.serverUrl = url;
        this.debugManager.addDebugInfo(`🔧 WebSocket服务器地址已更新: ${url}`);
    }

    /**
     * 获取连接统计信息
     */
    getConnectionStats() {
        return {
            serverUrl: this.serverUrl,
            currentState: this.getConnectionState(),
            isConnecting: this.isConnecting,
            shouldConnect: this.shouldConnect,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            reconnectInterval: this.reconnectInterval,
            backendProcessing: true // 标识数据处理在后端
        };
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.shouldConnect = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.debugManager.addDebugInfo('🧹 WebSocket管理器资源已清理');
    }
}
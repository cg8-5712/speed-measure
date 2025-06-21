/**
 * 速度监测系统 - 重构版前端应用
 * 简化的单文件JavaScript实现
 */

class SpeedMonitorApp {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.isMonitoring = false; // 是否正在监测数据
        this.chart = null;
        this.lapData = [];
        this.speedData = [];
        this.maxDataPoints = 50; // 最大数据点数
        
        this.initElements();
        this.initChart();
        this.bindEvents();
        this.addDebugLog('系统初始化完成');
        
        // 自动连接WebSocket
        this.connect();
    }
    
    initElements() {
        // 获取DOM元素
        this.elements = {
            connectionStatus: document.getElementById('connection-status'),
            startBtn: document.getElementById('start-btn'),
            stopBtn: document.getElementById('stop-btn'),
            resetBtn: document.getElementById('reset-btn'),
            
            currentLap: document.getElementById('current-lap'),
            totalTime: document.getElementById('total-time'),
            currentSpeed: document.getElementById('current-speed'),
            bestLap: document.getElementById('best-lap'),
            
            lapList: document.getElementById('lap-list'),
            debugLog: document.getElementById('debug-log')
        };
    }
    
    initChart() {
        const ctx = document.getElementById('speed-chart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '速度 (m/s)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '速度 (m/s)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '圈数'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                animation: {
                    duration: 300
                }
            }
        });
    }
    
    bindEvents() {
        this.elements.startBtn.addEventListener('click', () => this.startMonitoring());
        this.elements.stopBtn.addEventListener('click', () => this.stopMonitoring());
        this.elements.resetBtn.addEventListener('click', () => this.resetData());
        
        // 页面卸载时断开连接
        window.addEventListener('beforeunload', () => {
            if (this.ws) {
                this.ws.close();
            }
        });
    }
    
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.addDebugLog('WebSocket已连接');
            return;
        }
        
        this.updateConnectionStatus('connecting');
        this.addDebugLog('正在连接WebSocket服务器...');
        
        try {
            const wsUrl = `ws://${window.location.host}/ws`;
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                this.isConnected = true;
                this.updateConnectionStatus('connected');
                this.addDebugLog('WebSocket连接成功');
                
                this.startMonitoring();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (e) {
                    this.addDebugLog(`消息解析错误: ${e.message}`, 'error');
                }
            };
            
            this.ws.onclose = () => {
                this.isConnected = false;
                this.updateConnectionStatus('disconnected');
                this.addDebugLog('WebSocket连接已关闭，尝试重连...');
                
                setTimeout(() => {
                    if (!this.isConnected) {
                        this.connect();
                    }
                }, 3000);
            };
            
            this.ws.onerror = (error) => {
                this.addDebugLog(`WebSocket错误: ${error}`, 'error');
                this.updateConnectionStatus('disconnected');
            };
            
        } catch (e) {
            this.addDebugLog(`连接失败: ${e.message}`, 'error');
            this.updateConnectionStatus('disconnected');
        }
    }
    
    startMonitoring() {
        if (!this.isConnected) {
            this.addDebugLog('WebSocket未连接，无法开始监测', 'error');
            return;
        }
        
        this.isMonitoring = true;
        this.updateMonitoringStatus();
        this.addDebugLog('开始数据监测');
    }
    
    stopMonitoring() {
        this.isMonitoring = false;
        this.updateMonitoringStatus();
        this.addDebugLog('停止数据监测');
    }
    
    updateConnectionStatus(status) {
        const statusElement = this.elements.connectionStatus;
        
        statusElement.className = `status ${status}`;
        
        switch (status) {
            case 'connected':
                statusElement.textContent = 'WebSocket: 已连接';
                break;
            case 'connecting':
                statusElement.textContent = 'WebSocket: 连接中...';
                break;
            case 'disconnected':
                statusElement.textContent = 'WebSocket: 未连接';
                break;
        }
        
        // 更新监测按钮状态
        this.updateMonitoringStatus();
    }
    
    updateMonitoringStatus() {
        const startBtn = this.elements.startBtn;
        const stopBtn = this.elements.stopBtn;
        
        if (this.isConnected) {
            if (this.isMonitoring) {
                startBtn.disabled = true;
                stopBtn.disabled = false;
            } else {
                startBtn.disabled = false;
                stopBtn.disabled = true;
            }
        } else {
            startBtn.disabled = true;
            stopBtn.disabled = true;
        }
    }
    
    handleMessage(data) {
        // 只有在监测状态下才处理lap_data
        if (!this.isMonitoring && data.type === 'lap_data') {
            return;
        }
        
        this.addDebugLog(`收到消息: ${data.type}`);
        
        switch (data.type) {
            case 'init':
                this.addDebugLog(data.message);
                break;
                
            case 'lap_data':
                this.handleLapData(data);
                break;
                
            case 'reset_confirm':
                this.addDebugLog(data.message);
                break;
                
            default:
                this.addDebugLog(`未知消息类型: ${data.type}`, 'error');
        }
    }
    
    handleLapData(data) {
        // 更新统计数据
        this.elements.currentLap.textContent = data.lap_number;
        this.elements.totalTime.textContent = `${data.total_time} s`;
        this.elements.currentSpeed.textContent = `${data.speed} m/s`;
        
        // 更新最快圈速
        if (data.recent_laps && data.recent_laps.best_time > 0) {
            this.elements.bestLap.textContent = `${data.recent_laps.best_time} s`;
        }
        
        // 添加到数据数组
        this.lapData.push({
            lap: data.lap_number,
            time: data.lap_time,
            speed: data.speed,
            timestamp: data.timestamp
        });
        
        // 限制数据点数量
        if (this.lapData.length > this.maxDataPoints) {
            this.lapData.shift();
        }
        
        // 更新图表
        this.updateChart();
        
        // 更新圈速列表
        this.updateLapList();
        
        this.addDebugLog(`第${data.lap_number}圈: ${data.lap_time}s, ${data.speed}m/s`);
    }
    
    updateChart() {
        const labels = this.lapData.map(d => `第${d.lap}圈`);
        const speeds = this.lapData.map(d => d.speed);
        
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = speeds;
        this.chart.update('none'); // 无动画更新以提高性能
    }
    
    updateLapList() {
        const lapList = this.elements.lapList;
        
        // 清空现有内容
        lapList.innerHTML = '';
        
        if (this.lapData.length === 0) {
            lapList.innerHTML = '<div class="no-data">暂无数据</div>';
            return;
        }
        
        // 显示最近的圈数（倒序）
        const recentLaps = this.lapData.slice(-10).reverse();
        
        recentLaps.forEach(lap => {
            const lapItem = document.createElement('div');
            lapItem.className = 'lap-item';
            lapItem.innerHTML = `
                <span class="lap-number">第${lap.lap}圈</span>
                <span class="lap-time">${lap.time}s</span>
                <span class="lap-speed">${lap.speed}m/s</span>
            `;
            lapList.appendChild(lapItem);
        });
    }
    
    resetData() {
        if (confirm('确定要重置所有数据吗？')) {
            // 发送重置指令给后端
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'reset_data',
                    timestamp: Date.now()
                }));
                this.addDebugLog('已发送重置指令给后端');
            }
            
            // 重置前端数据
            this.lapData = [];
            this.speedData = [];
            
            // 重置显示
            this.elements.currentLap.textContent = '0';
            this.elements.totalTime.textContent = '0.000 s';
            this.elements.currentSpeed.textContent = '0.00 m/s';
            this.elements.bestLap.textContent = '0.000 s';
            
            // 清空图表
            this.chart.data.labels = [];
            this.chart.data.datasets[0].data = [];
            this.chart.update();
            
            // 清空圈速列表
            this.updateLapList();
            
            this.addDebugLog('前端数据已重置');
        }
    }
    
    addDebugLog(message, type = 'info') {
        const debugLog = this.elements.debugLog;
        const time = new Date().toLocaleTimeString();
        
        const entry = document.createElement('div');
        entry.className = `debug-entry ${type === 'error' ? 'debug-error' : ''}`;
        entry.innerHTML = `
            <span class="debug-time">[${time}]</span>
            <span class="debug-message">${message}</span>
        `;
        
        debugLog.appendChild(entry);
        
        // 限制日志条数
        const entries = debugLog.children;
        if (entries.length > 100) {
            debugLog.removeChild(entries[0]);
        }
        
        // 滚动到底部
        debugLog.scrollTop = debugLog.scrollHeight;
        
        // 同时输出到控制台
        console.log(`[Speed Monitor] ${message}`);
    }
}

// 当页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.speedMonitorApp = new SpeedMonitorApp();
});

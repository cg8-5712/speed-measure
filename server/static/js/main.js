// 主模块 - 应用程序入口点（删除导出功能）
import { WebSocketManager } from './modules/websocketManager.js';
import { SettingsManager } from './modules/settingsManager.js';
import { DataProcessor } from './modules/dataProcessor.js';
import { ChartManager } from './modules/chartManager.js';
import { UIManager } from './modules/uiManager.js';
import { DebugManager } from './modules/debugManager.js';

/**
 * 速度监测系统主应用类（已删除导出功能）
 * 数据处理逻辑已移至Python后端
 */
class SpeedMonitorApp {
    constructor() {
        this.initializeManagers();
        this.setupManagerConnections();
        this.bindEvents();
        this.initializeApp();
    }

    /**
     * 初始化各个管理器
     */
    initializeManagers() {
        // 创建调试管理器（其他模块可能需要用到）
        this.debugManager = new DebugManager();

        // 创建设置管理器
        this.settingsManager = new SettingsManager(this.debugManager);

        // 创建UI管理器
        this.uiManager = new UIManager(this.debugManager);

        // 创建数据处理器（简化版，主要负责UI更新）
        this.dataProcessor = new DataProcessor(
            this.settingsManager,
            this.uiManager,
            this.debugManager
        );

        // 创建图表管理器
        this.chartManager = new ChartManager(this.debugManager);

        // 创建WebSocket管理器（支持双向通信）
        this.webSocketManager = new WebSocketManager(
            this.dataProcessor,
            this.uiManager,
            this.debugManager
        );
    }

    /**
     * 建立管理器之间的连接
     */
    setupManagerConnections() {
        // 设置WebSocket管理器引用到设置管理器
        this.settingsManager.setWebSocketManager(this.webSocketManager);

        // 监听数据处理器的后端设置更新
        this.dataProcessor.on('settingUpdateFromBackend', (data) => {
            this.settingsManager.updateSettingFromBackend(data.key, data.value);
        });

        // 监听后端设置更新
        this.dataProcessor.on('backendSettings', (settings) => {
            this.settingsManager.receiveBackendSettings(settings);
        });
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // WebSocket控制按钮
        document.getElementById('startButton').addEventListener('click', () => {
            this.webSocketManager.startConnection();
        });

        document.getElementById('stopButton').addEventListener('click', () => {
            this.webSocketManager.stopConnection();
        });

        // 设置相关按钮
        document.getElementById('settingsButton').addEventListener('click', () => {
            this.settingsManager.openSettings();
        });

        document.getElementById('closeSettingsButton').addEventListener('click', () => {
            this.settingsManager.closeSettings();
        });

        document.getElementById('openSettingsLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.settingsManager.openSettings();
        });

        document.getElementById('resetDataButton').addEventListener('click', () => {
            this.settingsManager.resetLapData();
            this.settingsManager.closeSettings();
        });

        // 点击模态窗口外部关闭设置
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('settingsModal');
            if (event.target === modal) {
                this.settingsManager.closeSettings();
            }
        });

        // 数据处理器事件
        this.dataProcessor.on('dataUpdated', (data) => {
            this.chartManager.updateChart(data);
        });

        // 数据重置事件
        this.dataProcessor.on('dataReset', () => {
            this.chartManager.clearChart();
        });

        // 页面卸载时清理资源
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * 初始化应用程序
     */
    initializeApp() {
        // 初始化设置
        this.settingsManager.initialize();

        // 初始化图表
        this.chartManager.initialize();

        // 初始化UI状态
        this.uiManager.initializeUI();

        // 添加启动信息
        this.debugManager.addDebugInfo('📱 系统已就绪，点击"启动连接"开始监测');
        this.debugManager.addDebugInfo('🔄 数据处理逻辑已移至Python后端');
        this.debugManager.addDebugInfo('❌ 导出功能已删除');

        // 更新footer年份
        this.updateFooterYear();

        console.log('速度监测系统初始化完成（后端数据处理模式，已删除导出功能）');
    }

    /**
     * 更新footer年份
     */
    updateFooterYear() {
        const currentYear = new Date().getFullYear();
        const footerText = document.querySelector('.footer-bottom p');
        if (footerText && currentYear !== 2025) {
            footerText.innerHTML = footerText.innerHTML.replace('2025', currentYear);
        }
    }

    /**
     * 手动请求统计数据
     */
    requestStats() {
        this.webSocketManager.requestStats();
    }

    /**
     * 清理资源
     */
    cleanup() {
        if (this.webSocketManager) {
            this.webSocketManager.cleanup();
        }
        if (this.chartManager) {
            this.chartManager.cleanup();
        }
    }

    /**
     * 获取应用版本信息
     */
    getVersion() {
        return {
            version: '1.8.5',
            build: new Date().toISOString(),
            dataProcessing: 'Backend (Python)',
            frontendMode: 'UI Only',
            exportFeature: 'Removed',
            modules: [
                'WebSocketManager (双向通信)',
                'SettingsManager (后端同步)',
                'DataProcessor (简化版)',
                'ChartManager',
                'UIManager',
                'DebugManager'
            ]
        };
    }

    /**
     * 获取系统状态
     */
    getSystemStatus() {
        return {
            websocket: this.webSocketManager.getConnectionStats(),
            settings: this.settingsManager.getSettingsSummary(),
            debug: this.debugManager.getStats(),
            chart: this.chartManager.getChartStats(),
            ui: this.uiManager.getUIState()
        };
    }
}

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 创建全局应用实例
    window.speedMonitorApp = new SpeedMonitorApp();

    // 在开发模式下暴露应用实例到控制台
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Speed Monitor App initialized (Backend Processing Mode, Export Removed):', window.speedMonitorApp.getVersion());
        console.log('System Status:', window.speedMonitorApp.getSystemStatus());

        // 开发工具
        window.speedMonitorDebug = {
            requestStats: () => window.speedMonitorApp.requestStats(),
            getStatus: () => window.speedMonitorApp.getSystemStatus()
        };
    }
});

// 导出应用类供其他模块使用
export { SpeedMonitorApp };
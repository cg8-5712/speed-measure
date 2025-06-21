/**
 * 调试管理器
 * 负责调试信息的记录、显示和管理
 */
export class DebugManager {
    constructor() {
        this.debugMessages = [];
        this.maxMessages = 2000;
        this.isVisible = true;
        this.logLevel = 'info'; // 'debug', 'info', 'warn', 'error'
        this.enableConsoleLog = true;

        // 缓存DOM元素
        this.elements = {
            debugInfo: null,
            debugContent: null
        };

        this.initializeElements();
    }

    /**
     * 初始化DOM元素
     */
    initializeElements() {
        this.elements.debugInfo = document.getElementById('debugInfo');
        this.elements.debugContent = document.getElementById('debugContent');

        if (!this.elements.debugInfo || !this.elements.debugContent) {
            console.warn('Debug Manager: 调试面板DOM元素未找到');
        }
    }

    /**
     * 添加调试信息
     */
    addDebugInfo(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = this.formatMessage(message, level, timestamp);

        // 添加到消息数组
        this.debugMessages.push({
            message: message,
            level: level,
            timestamp: timestamp,
            formattedMessage: formattedMessage,
            id: Date.now() + Math.random()
        });

        // 限制消息数量
        if (this.debugMessages.length > this.maxMessages) {
            this.debugMessages = this.debugMessages.slice(-Math.floor(this.maxMessages * 0.8));
        }

        // 更新显示
        this.updateDisplay();

        // 控制台输出
        if (this.enableConsoleLog) {
            this.logToConsole(message, level);
        }
    }

    /**
     * 格式化消息
     */
    formatMessage(message, level, timestamp) {
        const levelIcons = {
            debug: '🔍',
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌',
            success: '✅'
        };

        const icon = levelIcons[level] || 'ℹ️';
        const levelClass = `debug-${level}`;

        return `<div class="debug-message ${levelClass}" data-level="${level}" data-timestamp="${timestamp}">
            <span class="debug-time">[${timestamp}]</span>
            <span class="debug-content"><span class="debug-icon">${icon}</span><span class="debug-text">${this.escapeHtml(message)}</span></span>
        </div>`;
    }

    /**
     * 转义HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 更新显示
     */
    updateDisplay() {
        if (!this.elements.debugContent || !this.isVisible) {
            return;
        }

        try {
            // 获取当前滚动位置
            const shouldScrollToBottom = this.isScrolledToBottom();

            // 渲染消息
            const displayMessages = this.getFilteredMessages();
            this.elements.debugContent.innerHTML = displayMessages.map(msg => msg.formattedMessage).join('');

            // 恢复滚动位置
            if (shouldScrollToBottom) {
                this.scrollToBottom();
            }

            // 添加调试面板样式
            this.addDebugStyles();
        } catch (error) {
            console.error('Debug Manager: 更新显示失败', error);
        }
    }

    /**
     * 检查是否滚动到底部
     */
    isScrolledToBottom() {
        if (!this.elements.debugContent) return true;

        const element = this.elements.debugContent;
        return element.scrollHeight - element.scrollTop <= element.clientHeight + 5;
    }

    /**
     * 滚动到底部
     */
    scrollToBottom() {
        if (this.elements.debugContent) {
            this.elements.debugContent.scrollTop = this.elements.debugContent.scrollHeight;
        }
    }

    /**
     * 获取过滤后的消息
     */
    getFilteredMessages() {
        const levelPriority = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };

        const currentLevelPriority = levelPriority[this.logLevel] || 1;

        return this.debugMessages.filter(msg =>
            (levelPriority[msg.level] || 1) >= currentLevelPriority
        );
    }

    /**
     * 控制台日志输出
     */
    logToConsole(message, level) {
        const prefix = '[SpeedMonitor]';

        switch (level) {
            case 'debug':
                console.debug(prefix, message);
                break;
            case 'info':
                console.info(prefix, message);
                break;
            case 'warn':
                console.warn(prefix, message);
                break;
            case 'error':
                console.error(prefix, message);
                break;
            case 'success':
                console.log(prefix, '✅', message);
                break;
            default:
                console.log(prefix, message);
        }
    }

    /**
     * 添加调试面板样式
     */
    addDebugStyles() {
        // 检查是否已经添加了样式
        if (document.getElementById('debug-manager-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'debug-manager-styles';
        style.textContent = `
            .debug-message {
                padding: 2px 0;
                border-bottom: 1px solid rgba(224, 242, 241, 0.3);
                font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
                font-size: 0.85rem;
                line-height: 1.4;
                display: flex;
                align-items: flex-start;
                gap: 8px;
            }
            
            .debug-message:last-child {
                border-bottom: none;
            }
            
            .debug-time {
                color: #78909c;
                font-size: 0.8rem;
                flex-shrink: 0;
                min-width: 75px;
            }
            
            .debug-icon {
                flex-shrink: 0;
                font-size: 0.9rem;
            }
            
            .debug-text {
                flex: 1;
                word-break: break-word;
            }
            
            .debug-debug {
                opacity: 0.7;
            }
            
            .debug-debug .debug-text {
                color: #607d8b;
            }
            
            .debug-info .debug-text {
                color: #37474f;
            }
            
            .debug-warn {
                background: rgba(255, 193, 7, 0.1);
            }
            
            .debug-warn .debug-text {
                color: #f57c00;
            }
            
            .debug-error {
                background: rgba(244, 67, 54, 0.1);
            }
            
            .debug-error .debug-text {
                color: #d32f2f;
                font-weight: 600;
            }
            
            .debug-success {
                background: rgba(76, 175, 80, 0.1);
            }
            
            .debug-success .debug-text {
                color: #388e3c;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * 清空调试信息
     */
    clearDebugInfo() {
        this.debugMessages = [];
        this.updateDisplay();
        this.addDebugInfo('🧹 调试信息已清空', 'info');
    }

    /**
     * 设置显示状态
     */
    setVisible(visible) {
        this.isVisible = visible;

        if (this.elements.debugInfo) {
            this.elements.debugInfo.style.display = visible ? 'flex' : 'none';
        }

        this.addDebugInfo(`🔍 调试面板${visible ? '已显示' : '已隐藏'}`, 'info');
    }

    /**
     * 设置日志级别
     */
    setLogLevel(level) {
        const validLevels = ['debug', 'info', 'warn', 'error'];
        if (validLevels.includes(level)) {
            this.logLevel = level;
            this.updateDisplay();
            this.addDebugInfo(`📊 日志级别已设置为: ${level}`, 'info');
        } else {
            this.addDebugInfo(`❌ 无效的日志级别: ${level}`, 'error');
        }
    }

    /**
     * 设置最大消息数量
     */
    setMaxMessages(max) {
        this.maxMessages = Math.max(100, Math.min(5000, max));

        if (this.debugMessages.length > this.maxMessages) {
            this.debugMessages = this.debugMessages.slice(-this.maxMessages);
            this.updateDisplay();
        }

        this.addDebugInfo(`📝 最大消息数量已设置为: ${this.maxMessages}`, 'info');
    }

    /**
     * 启用/禁用控制台日志
     */
    setConsoleLog(enabled) {
        this.enableConsoleLog = enabled;
        this.addDebugInfo(`🖥️ 控制台日志${enabled ? '已启用' : '已禁用'}`, 'info');
    }

    /**
     * 导出调试日志
     */
    exportLogs() {
        const exportData = {
            timestamp: new Date().toISOString(),
            version: '1.8.5',
            logLevel: this.logLevel,
            totalMessages: this.debugMessages.length,
            messages: this.debugMessages.map(msg => ({
                timestamp: msg.timestamp,
                level: msg.level,
                message: msg.message
            }))
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `debug-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        link.click();

        this.addDebugInfo('📤 调试日志已导出', 'success');
    }

    /**
     * 搜索调试消息
     */
    searchMessages(query) {
        if (!query) return this.debugMessages;

        const lowerQuery = query.toLowerCase();
        return this.debugMessages.filter(msg =>
            msg.message.toLowerCase().includes(lowerQuery) ||
            msg.level.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const stats = {
            total: this.debugMessages.length,
            byLevel: {
                debug: 0,
                info: 0,
                warn: 0,
                error: 0,
                success: 0
            },
            memoryUsage: this.getMemoryUsage(),
            isVisible: this.isVisible,
            logLevel: this.logLevel,
            maxMessages: this.maxMessages
        };

        this.debugMessages.forEach(msg => {
            if (stats.byLevel.hasOwnProperty(msg.level)) {
                stats.byLevel[msg.level]++;
            }
        });

        return stats;
    }

    /**
     * 获取内存使用情况（近似）
     */
    getMemoryUsage() {
        const totalChars = this.debugMessages.reduce((sum, msg) => sum + msg.message.length, 0);
        return {
            estimatedBytes: totalChars * 2, // 近似估算（UTF-16）
            messagesCount: this.debugMessages.length,
            avgMessageLength: totalChars / this.debugMessages.length || 0
        };
    }

    /**
     * 调试辅助方法
     */
    debug(message) {
        this.addDebugInfo(message, 'debug');
    }

    info(message) {
        this.addDebugInfo(message, 'info');
    }

    warn(message) {
        this.addDebugInfo(message, 'warn');
    }

    error(message) {
        this.addDebugInfo(message, 'error');
    }

    success(message) {
        this.addDebugInfo(message, 'success');
    }

    /**
     * 性能监控
     */
    startTimer(label) {
        const startTime = performance.now();
        this.debug(`⏱️ 计时器启动: ${label}`);

        return {
            end: () => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                this.info(`⏱️ ${label} 完成，耗时: ${duration.toFixed(2)}ms`);
                return duration;
            }
        };
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.clearDebugInfo();

        // 移除添加的样式
        const styleElement = document.getElementById('debug-manager-styles');
        if (styleElement) {
            styleElement.remove();
        }

        this.addDebugInfo('🧹 调试管理器资源已清理', 'info');
    }
}
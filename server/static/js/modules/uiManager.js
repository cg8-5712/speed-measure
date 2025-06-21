/**
 * UI管理器（修复命名问题）
 * 负责更新用户界面元素和状态显示
 * 支持驼峰命名法的数据字段
 */
export class UIManager {
    constructor(debugManager) {
        this.debugManager = debugManager;

        // 缓存DOM元素
        this.elements = {};
        this.cacheElements();
    }

    /**
     * 安全地格式化数值
     */
    safeFormatNumber(value, decimals = 3, defaultValue = '0.000') {
        if (value === null || value === undefined || isNaN(value)) {
            return defaultValue;
        }
        return Number(value).toFixed(decimals);
    }

    /**
     * 安全地获取属性值
     */
    safeGet(obj, path, defaultValue = null) {
        if (!obj) return defaultValue;

        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current === null || current === undefined || !(key in current)) {
                return defaultValue;
            }
            current = current[key];
        }

        return current;
    }

    /**
     * 缓存常用的DOM元素
     */
    cacheElements() {
        this.elements = {
            // 状态和控制按钮
            status: document.getElementById('status'),
            startButton: document.getElementById('startButton'),
            stopButton: document.getElementById('stopButton'),

            // 统计显示
            currentLap: document.getElementById('currentLap'),
            totalTime: document.getElementById('totalTime'),

            // 详细信息面板
            lapDetails: document.getElementById('lapDetails'),
            recentLapsDetails: document.getElementById('recentLapsDetails'),
            recentLapsDisplayCount: document.getElementById('recentLapsDisplayCount'),

            // 统计部分
            statsSection: document.getElementById('statsSection'),
            recentLapsCount: document.getElementById('recentLapsCount'),
            recentLapsTotal: document.getElementById('recentLapsTotal'),
            bestLapsCount: document.getElementById('bestLapsCount'),
            bestLapsTime: document.getElementById('bestLapsTime')
        };
    }

    /**
     * 初始化UI状态
     */
    initializeUI() {
        this.updateStatus('未连接', false);
        this.updateControlButtons('disconnected');
        this.hideStatsSection();

        // 初始化统计显示
        this.elements.currentLap.textContent = '0';
        this.elements.totalTime.textContent = '0.000 s';

        // 清空详细信息
        this.elements.lapDetails.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">⏳ 等待数据...</div>';
        this.elements.recentLapsDetails.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">⏳ 等待更多圈数数据...</div>';

        this.debugManager.addDebugInfo('🎨 UI管理器已初始化（支持驼峰命名）');
    }

    /**
     * 更新连接状态显示
     */
    updateStatus(message, isConnected) {
        this.elements.status.textContent = `WebSocket状态: ${message}`;
        this.elements.status.className = `status ${isConnected ? 'connected' : 'disconnected'}`;
    }

    /**
     * 更新控制按钮状态
     */
    updateControlButtons(state) {
        const startBtn = this.elements.startButton;
        const stopBtn = this.elements.stopButton;

        switch(state) {
            case 'connecting':
                startBtn.disabled = true;
                startBtn.innerHTML = '🔄 连接中...';
                stopBtn.disabled = false;
                break;
            case 'connected':
                startBtn.disabled = true;
                startBtn.innerHTML = '✅ 已连接';
                stopBtn.disabled = false;
                break;
            case 'disconnected':
                startBtn.disabled = false;
                startBtn.innerHTML = '▶️ 启动连接';
                stopBtn.disabled = true;
                break;
        }
    }

    /**
     * 更新圈数信息
     */
    updateLapInfo(lapInfo) {
        try {
            // 安全获取数据
            const currentLap = this.safeGet(lapInfo, 'currentLap', 0);
            const totalTime = this.safeGet(lapInfo, 'totalTime', 0);
            const lapDetails = this.safeGet(lapInfo, 'lapDetails', []);
            const recentLapsStats = this.safeGet(lapInfo, 'recentLapsStats', {});
            const showStatsSection = this.safeGet(lapInfo, 'showStatsSection', false);

            // 更新基本统计
            this.elements.currentLap.textContent = currentLap.toString();
            this.elements.totalTime.textContent = this.safeFormatNumber(totalTime / 1000) + ' s';

            // 更新每圈详细时间
            this.updateLapDetails(lapDetails);

            // 更新近n圈组合时间
            this.updateRecentLapsDisplay(recentLapsStats);

            // 更新统计部分
            if (showStatsSection) {
                this.showStatsSection();
                this.updateRecentLapsStats(recentLapsStats);
            } else {
                this.hideStatsSection();
            }

        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 更新圈数信息错误: ${error.message}`);
        }
    }

    /**
     * 更新每圈详细时间显示
     */
    updateLapDetails(lapDetails) {
        try {
            if (!lapDetails || lapDetails.length === 0) {
                this.elements.lapDetails.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">⏳ 等待数据...</div>';
                return;
            }

            const lapDetailsHTML = lapDetails.map(detail => {
                // 支持两种命名方式的兼容性
                const lap = this.safeGet(detail, 'lap', 0);
                const lapTime = this.safeGet(detail, 'lapTime', this.safeGet(detail, 'lap_time', 0));

                return `<div class="lap-item">第${lap}圈: ${this.safeFormatNumber(lapTime)} ms</div>`;
            }).join('');

            this.elements.lapDetails.innerHTML = lapDetailsHTML;

            // 自动滚动到最新内容
            this.elements.lapDetails.scrollTop = this.elements.lapDetails.scrollHeight;

        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 更新圈详情错误: ${error.message}`);
        }
    }

    /**
     * 更新近n圈组合时间显示
     */
    updateRecentLapsDisplay(recentLapsStats) {
        try {
            const targetLaps = this.safeGet(recentLapsStats, 'targetLaps', 3);
            const hasEnoughData = this.safeGet(recentLapsStats, 'hasEnoughData', false);
            const recentCombinations = this.safeGet(recentLapsStats, 'recentCombinations', []);

            this.elements.recentLapsDisplayCount.textContent = targetLaps.toString();

            if (!hasEnoughData) {
                this.elements.recentLapsDetails.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">⏳ 等待更多圈数数据...</div>';
                return;
            }

            let recentLapsHTML = '';
            recentCombinations.forEach(combo => {
                // 支持两种命名方式的兼容性
                const startLap = this.safeGet(combo, 'startLap', this.safeGet(combo, 'start_lap', 0));
                const endLap = this.safeGet(combo, 'endLap', this.safeGet(combo, 'end_lap', 0));
                const totalTime = this.safeGet(combo, 'totalTime', this.safeGet(combo, 'total_time', 0));
                const isBest = this.safeGet(combo, 'isBest', this.safeGet(combo, 'is_best', false));

                const itemClass = isBest ? 'recent-lap-item recent-lap-best' : 'recent-lap-item';
                recentLapsHTML += `<div class="${itemClass}">第${startLap}-${endLap}圈: ${this.safeFormatNumber(totalTime/1000)} s</div>`;
            });

            this.elements.recentLapsDetails.innerHTML = recentLapsHTML;

            // 自动滚动到最新内容
            this.elements.recentLapsDetails.scrollTop = this.elements.recentLapsDetails.scrollHeight;

        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 更新近n圈显示错误: ${error.message}`);
        }
    }

    /**
     * 更新近n圈统计
     */
    updateRecentLapsStats(recentLapsStats) {
        try {
            const targetLaps = this.safeGet(recentLapsStats, 'targetLaps', 3);
            const recentTotal = this.safeGet(recentLapsStats, 'recentTotal', 0);
            const bestTime = this.safeGet(recentLapsStats, 'bestTime', 0);

            this.elements.recentLapsCount.textContent = targetLaps.toString();
            this.elements.bestLapsCount.textContent = targetLaps.toString();

            this.elements.recentLapsTotal.textContent = this.safeFormatNumber(recentTotal / 1000) + ' s';
            this.elements.bestLapsTime.textContent = bestTime === 0 ? '0.000 s' : this.safeFormatNumber(bestTime / 1000) + ' s';

        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 更新近n圈统计错误: ${error.message}`);
        }
    }

    /**
     * 显示统计部分
     */
    showStatsSection() {
        this.elements.statsSection.style.display = 'block';
    }

    /**
     * 隐藏统计部分
     */
    hideStatsSection() {
        this.elements.statsSection.style.display = 'none';
    }

    /**
     * 显示加载状态
     */
    showLoading(elementId, message = '加载中...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<div style="text-align: center; color: #6c757d; padding: 20px;">🔄 ${message}</div>`;
        }
    }

    /**
     * 显示错误状态
     */
    showError(elementId, message = '发生错误') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<div style="text-align: center; color: #e57373; padding: 20px;">❌ ${message}</div>`;
        }
    }

    /**
     * 显示空状态
     */
    showEmpty(elementId, message = '暂无数据') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<div style="text-align: center; color: #6c757d; padding: 20px;">📭 ${message}</div>`;
        }
    }

    /**
     * 显示成功消息
     */
    showSuccessMessage(message, duration = 3000) {
        this.showMessage(message, 'success', duration);
    }

    /**
     * 显示错误消息
     */
    showErrorMessage(message, duration = 5000) {
        this.showMessage(message, 'error', duration);
    }

    /**
     * 显示信息消息
     */
    showInfoMessage(message, duration = 3000) {
        this.showMessage(message, 'info', duration);
    }

    /**
     * 通用消息显示方法
     */
    showMessage(message, type = 'info', duration = 3000) {
        try {
            // 创建消息元素
            const messageDiv = document.createElement('div');
            messageDiv.className = `message message-${type}`;
            messageDiv.textContent = message;

            // 添加样式
            Object.assign(messageDiv.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '15px 20px',
                borderRadius: '8px',
                color: 'white',
                fontWeight: '600',
                fontSize: '0.9rem',
                zIndex: '10000',
                minWidth: '250px',
                maxWidth: '400px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                transform: 'translateX(100%)',
                transition: 'transform 0.3s ease',
                wordWrap: 'break-word'
            });

            // 根据类型设置背景色
            const backgrounds = {
                success: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                error: 'linear-gradient(135deg, #f44336 0%, #e53935 100%)',
                info: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                warning: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)'
            };

            messageDiv.style.background = backgrounds[type] || backgrounds.info;

            // 添加到页面
            document.body.appendChild(messageDiv);

            // 动画显示
            setTimeout(() => {
                messageDiv.style.transform = 'translateX(0)';
            }, 100);

            // 自动隐藏
            setTimeout(() => {
                messageDiv.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.parentNode.removeChild(messageDiv);
                    }
                }, 300);
            }, duration);

            // 点击关闭
            messageDiv.addEventListener('click', () => {
                messageDiv.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.parentNode.removeChild(messageDiv);
                    }
                }, 300);
            });

        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 显示消息错误: ${error.message}`);
        }
    }

    /**
     * 更新元素内容
     */
    updateElement(elementId, content, isHTML = false) {
        const element = document.getElementById(elementId);
        if (element) {
            if (isHTML) {
                element.innerHTML = content;
            } else {
                element.textContent = content;
            }
        }
    }

    /**
     * 切换元素显示状态
     */
    toggleElement(elementId, show = null) {
        const element = document.getElementById(elementId);
        if (element) {
            if (show === null) {
                element.style.display = element.style.display === 'none' ? '' : 'none';
            } else {
                element.style.display = show ? '' : 'none';
            }
        }
    }

    /**
     * 添加CSS类
     */
    addClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add(className);
        }
    }

    /**
     * 移除CSS类
     */
    removeClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove(className);
        }
    }

    /**
     * 切换CSS类
     */
    toggleClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.toggle(className);
        }
    }

    /**
     * 获取UI状态摘要
     */
    getUIState() {
        return {
            connectionStatus: this.elements.status.textContent,
            currentLap: this.elements.currentLap.textContent,
            totalTime: this.elements.totalTime.textContent,
            statsVisible: this.elements.statsSection.style.display !== 'none',
            buttonsState: {
                startDisabled: this.elements.startButton.disabled,
                stopDisabled: this.elements.stopButton.disabled
            }
        };
    }
}
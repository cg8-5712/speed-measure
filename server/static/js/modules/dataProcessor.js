/**
 * 数据处理器
 * 负责处理WebSocket接收到的数据，计算速度和圈速统计
 */
export class DataProcessor {
    constructor(settingsManager, uiManager, debugManager) {
        this.settingsManager = settingsManager;
        this.uiManager = uiManager;
        this.debugManager = debugManager;

        // 初始化数据处理相关变量
        this.initializeVariables();

        // 事件回调
        this.callbacks = new Map();

        // 监听设置变更
        this.settingsManager.onSettingChange('targetLaps', (newValue) => {
            this.resetLapData();
        });
    }

    /**
     * 初始化变量
     */
    initializeVariables() {
        // 物理常量
        this.constants = {
            L: 3,        // 距离
            R1: 3.5 / 100,  // 半径1 (0.035)
            R2: 15       // 半径2
        };

        this.debugManager.addDebugInfo(`📐 物理常量: L=${this.constants.L}, R1=${this.constants.R1}, R2=${this.constants.R2}`);

        // 圈数相关变量
        this.resetVariables();
    }

    /**
     * 重置变量（但不清除UI）
     */
    resetVariables() {
        this.isFirstData = true;
        this.lapCount = 0;
        this.totalTime = 0;
        this.lastDataTime = null;
        this.lapDetails = [];
        this.lapTimes = [];
        this.velocityData = [];
    }

    /**
     * 处理接收到的数据
     */
    processData(t, jsonData) {
        const currentTime = Date.now();

        // 处理首次数据
        if (this.isFirstData) {
            this.handleFirstData(t, currentTime);
            return;
        }

        // 处理正常圈数数据
        this.processLapData(t, currentTime, jsonData);
    }

    /**
     * 处理首次数据
     */
    handleFirstData(t, currentTime) {
        this.isFirstData = false;
        this.lastDataTime = currentTime;
        this.debugManager.addDebugInfo(`首次数据 t=${t}ms，仅用于初始化时间基准，不计入圈数`);
    }

    /**
     * 处理圈数数据
     */
    processLapData(t, currentTime, jsonData) {
        // 计算时间间隔
        const interval = currentTime - this.lastDataTime;
        this.lastDataTime = currentTime;
        this.lapCount++;

        // 计算圈用时
        const lapTime = this.calculateLapTime(interval, t);
        this.totalTime += lapTime;
        this.lapTimes.push(lapTime);

        // 添加圈详情
        this.lapDetails.push({
            lap: this.lapCount,
            lapTime: lapTime,
            timestamp: currentTime,
            measurement: t,
            interval: interval
        });

        this.debugManager.addDebugInfo(`第${this.lapCount}圈完成，用时: ${lapTime.toFixed(3)}ms`);

        // 限制存储的数据量
        this.limitDataStorage();

        // 计算速度
        const velocityData = this.calculateVelocity(t, currentTime);
        this.velocityData.push(velocityData);

        // 更新UI
        this.uiManager.updateLapInfo(this.getCurrentLapInfo());

        // 触发数据更新事件
        this.triggerEvent('dataUpdated', {
            lapCount: this.lapCount,
            lapTime: lapTime,
            totalTime: this.totalTime,
            velocity: velocityData,
            lapDetails: this.lapDetails,
            recentLaps: this.getRecentLapsStats()
        });
    }

    /**
     * 计算圈用时
     */
    calculateLapTime(interval, measurement) {
        // 每圈总用时 = 间隔时间 + 测量值
        return interval + measurement;
    }

    /**
     * 计算速度
     */
    calculateVelocity(t, currentTime) {
        const v1 = this.constants.L / t;
        const v2 = (v1 * this.constants.R2) / this.constants.R1;

        const velocityData = {
            timestamp: currentTime,
            time: new Date(currentTime).toLocaleTimeString(),
            t: t,
            v1: v1,
            v2: v2
        };

        this.debugManager.addDebugInfo(
            `✅ 计算结果: t=${t.toFixed(3)}, v1=${v1.toFixed(4)}, v2=${v2.toFixed(2)}`
        );

        if (isNaN(v1) || isNaN(v2) || !isFinite(v1) || !isFinite(v2)) {
            this.debugManager.addDebugInfo(`❌ 计算结果无效: v1=${v1}, v2=${v2}`);
            return null;
        }

        return velocityData;
    }

    /**
     * 限制数据存储量
     */
    limitDataStorage() {
        const lapDisplayLimit = this.settingsManager.getSetting('lapDisplayLimit');

        if (this.lapDetails.length > lapDisplayLimit * 2) {
            this.lapDetails = this.lapDetails.slice(-lapDisplayLimit);
        }

        if (this.velocityData.length > 100) {
            this.velocityData = this.velocityData.slice(-100);
        }
    }

    /**
     * 获取当前圈数信息
     */
    getCurrentLapInfo() {
        const targetLaps = this.settingsManager.getSetting('targetLaps');
        const lapDisplayLimit = this.settingsManager.getSetting('lapDisplayLimit');

        return {
            currentLap: this.lapCount,
            totalTime: this.totalTime,
            targetLaps: targetLaps,
            lapDetails: this.lapDetails.slice(-lapDisplayLimit),
            recentLapsStats: this.getRecentLapsStats(),
            showStatsSection: this.lapCount >= targetLaps
        };
    }

    /**
     * 获取近n圈统计
     */
    getRecentLapsStats() {
        const targetLaps = this.settingsManager.getSetting('targetLaps');
        const n = targetLaps;

        if (this.lapTimes.length === 0) {
            return {
                recentTotal: 0,
                bestTime: 0,
                recentCombinations: [],
                hasEnoughData: false
            };
        }

        const hasEnoughData = this.lapTimes.length >= n;
        let recentTotal = 0;
        let bestTime = Infinity;
        const recentCombinations = [];

        if (hasEnoughData) {
            let currentSum = this.lapTimes.slice(0, n).reduce((sum, time) => sum + time, 0);
            bestTime = currentSum;

            recentCombinations.push({
                startLap: 1,
                endLap: n,
                totalTime: currentSum,
                isBest: false // Will be updated later
            });

            // Use sliding window to populate all combinations and find the best time
            for (let i = n; i < this.lapTimes.length; i++) {
                currentSum = currentSum - this.lapTimes[i - n] + this.lapTimes[i];

                recentCombinations.push({
                    startLap: i - n + 2,
                    endLap: i + 1,
                    totalTime: currentSum,
                    isBest: false // Will be updated later
                });

                if (currentSum < bestTime) {
                    bestTime = currentSum;
                }
            }

            // Mark the best combination(s)
            recentCombinations.forEach(combo => {
                combo.isBest = combo.totalTime === bestTime;
            });

            // Get total time for the most recent n laps
            const recentLaps = this.lapTimes.slice(-n);
            recentTotal = recentLaps.reduce((sum, time) => sum + time, 0);
        }
    }

    /**
     * 重置圈数据
     */
    resetLapData() {
        this.resetVariables();
        this.uiManager.hideStatsSection();
        this.uiManager.updateLapInfo(this.getCurrentLapInfo());
        this.debugManager.addDebugInfo('🔄 数据已重置');

        this.triggerEvent('dataReset', {
            timestamp: Date.now()
        });
    }

    /**
     * 获取统计摘要
     */
    getStatsSummary() {
        if (this.lapTimes.length === 0) {
            return null;
        }

        const avgLapTime = this.lapTimes.reduce((sum, time) => sum + time, 0) / this.lapTimes.length;
        const fastestLap = Math.min(...this.lapTimes);
        const slowestLap = Math.max(...this.lapTimes);

        return {
            totalLaps: this.lapCount,
            totalTime: this.totalTime,
            avgLapTime: avgLapTime,
            fastestLap: fastestLap,
            slowestLap: slowestLap,
            lapTimes: [...this.lapTimes],
            velocityDataPoints: this.velocityData.length
        };
    }

    /**
     * 获取最新的速度数据用于图表
     */
    getLatestVelocityData(limit = 20) {
        return this.velocityData.slice(-limit);
    }

    /**
     * 导出数据
     */
    exportData() {
        const exportData = {
            timestamp: new Date().toISOString(),
            version: '1.8.5',
            constants: this.constants,
            stats: this.getStatsSummary(),
            lapDetails: this.lapDetails,
            velocityData: this.velocityData,
            settings: this.settingsManager.getAllSettings()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `speed-monitor-data-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        link.click();

        this.debugManager.addDebugInfo('📤 数据已导出');
    }

    /**
     * 注册事件回调
     */
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }

    /**
     * 移除事件回调
     */
    off(event, callback) {
        if (this.callbacks.has(event)) {
            const callbacks = this.callbacks.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 触发事件
     */
    triggerEvent(event, data) {
        if (this.callbacks.has(event)) {
            this.callbacks.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.debugManager.addDebugInfo(`❌ 事件回调执行失败: ${error.message}`);
                }
            });
        }
    }
}

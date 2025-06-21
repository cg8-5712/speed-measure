/**
 * 前端数据处理器（删除导出功能）
 * 主要负责接收后端处理好的数据并触发UI更新
 */
export class DataProcessor {
    constructor(settingsManager, uiManager, debugManager) {
        this.settingsManager = settingsManager;
        this.uiManager = uiManager;
        this.debugManager = debugManager;

        // 事件回调
        this.callbacks = new Map();

        // 当前数据状态（用于UI显示）
        this.currentState = {
            lapCount: 0,
            totalTime: 0,
            latestVelocity: null,
            lapInfo: null,
            recentStats: null
        };

        this.debugManager.addDebugInfo('📊 前端数据处理器已初始化（已删除导出功能）');
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
     * 验证数据结构
     */
    validateData(data, requiredFields) {
        const missingFields = [];

        for (const field of requiredFields) {
            if (this.safeGet(data, field) === null) {
                missingFields.push(field);
            }
        }

        if (missingFields.length > 0) {
            this.debugManager.addDebugInfo(`⚠️ 数据验证失败，缺少字段: ${missingFields.join(', ')}`);
            return false;
        }

        return true;
    }

    /**
     * 处理从后端WebSocket接收到的已处理数据
     */
    processBackendData(data) {
        try {
            const messageType = this.safeGet(data, 'type', 'unknown');

            console.log(`📥 收到后端数据，类型: ${messageType}`);
            this.debugManager.addDebugInfo(`📥 收到后端数据，类型: ${messageType}`);

            switch (messageType) {
                case 'lap_data':
                    this.handleLapData(data);
                    break;

                case 'debug':
                    this.handleDebugMessage(data);
                    break;

                case 'data_reset':
                    this.handleDataReset(data);
                    break;

                case 'setting_updated':
                    this.handleSettingUpdate(data);
                    break;

                case 'settings_update':
                    this.handleSettingsUpdate(data);
                    break;

                case 'stats_response':
                    this.handleStatsResponse(data);
                    break;

                case 'memory_usage_response':
                    this.handleMemoryUsageResponse(data);
                    break;

                case 'error':
                    this.handleErrorMessage(data);
                    break;

                default:
                    this.debugManager.addDebugInfo(`⚠️ 未知的消息类型: ${messageType}`);
            }
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 处理后端数据错误: ${error.message}`);
            console.error('Frontend data processing error:', error, data);
        }
    }

    /**
     * 处理圈数据
     */
    handleLapData(data) {
        try {
            // 验证必需字段（使用驼峰命名）
            const requiredFields = ['lapCount', 'totalTime'];
            if (!this.validateData(data, requiredFields)) {
                this.debugManager.addDebugInfo('❌ 圈数据验证失败，但继续尝试处理...');

                // 尝试查找可能的替代字段名
                const alternativeFields = {
                    'lapCount': ['lap_count', 'laps', 'currentLap'],
                    'totalTime': ['total_time', 'time', 'totalDuration']
                };

                for (const [required, alternatives] of Object.entries(alternativeFields)) {
                    if (this.safeGet(data, required) === null) {
                        for (const alt of alternatives) {
                            const altValue = this.safeGet(data, alt);
                            if (altValue !== null) {
                                data[required] = altValue;
                                break;
                            }
                        }
                    }
                }
            }

            // 安全获取数据（使用驼峰命名）
            const lapCount = this.safeGet(data, 'lapCount', 0);
            const totalTime = this.safeGet(data, 'totalTime', 0);
            const lapTime = this.safeGet(data, 'lapTime', 0);
            const velocity = this.safeGet(data, 'velocity', null);
            const lapInfo = this.safeGet(data, 'lapInfo', {});
            const recentStats = this.safeGet(data, 'recentStats', {});

            // 更新当前状态
            this.currentState = {
                lapCount: lapCount,
                totalTime: totalTime,
                latestVelocity: velocity,
                lapInfo: lapInfo,
                recentStats: recentStats
            };

            this.debugManager.addDebugInfo(
                `📊 收到第${lapCount}圈数据，用时: ${this.safeFormatNumber(lapTime)}ms`
            );

            // 更新UI
            this.updateUI(data);

            // 触发数据更新事件（用于图表更新）
            this.triggerEvent('dataUpdated', {
                lapCount: lapCount,
                lapTime: lapTime,
                totalTime: totalTime,
                velocity: velocity,
                lapDetails: this.safeGet(lapInfo, 'lapDetails', []),
                recentLaps: recentStats
            });

        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 处理圈数据错误: ${error.message}`);
            console.error('Lap data processing error:', error, data);
        }
    }

    /**
     * 更新UI
     */
    updateUI(data) {
        try {
            const lapCount = this.safeGet(data, 'lapCount', 0);
            const totalTime = this.safeGet(data, 'totalTime', 0);
            const lapInfo = this.safeGet(data, 'lapInfo', {});
            const recentStats = this.safeGet(data, 'recentStats', {});
            const showStatsSection = this.safeGet(data, 'showStatsSection', false);

            // 构造UI更新数据
            const uiData = {
                currentLap: lapCount,
                totalTime: totalTime,
                targetLaps: this.settingsManager.getSetting('targetLaps') || 3,
                lapDetails: this.safeGet(lapInfo, 'lapDetails', []),
                recentLapsStats: recentStats,
                showStatsSection: showStatsSection
            };

            // 更新UI
            this.uiManager.updateLapInfo(uiData);

        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 更新UI错误: ${error.message}`);
        }
    }

    /**
     * 处理调试消息
     */
    handleDebugMessage(data) {
        try {
            const message = this.safeGet(data, 'message', '未知调试消息');
            this.debugManager.addDebugInfo(`🔍 后端: ${message}`);
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 处理调试消息错误: ${error.message}`);
        }
    }

    /**
     * 处理数据重置
     */
    handleDataReset(data) {
        try {
            // 重置本地状态
            this.currentState = {
                lapCount: 0,
                totalTime: 0,
                latestVelocity: null,
                lapInfo: null,
                recentStats: null
            };

            // 更新UI
            this.uiManager.hideStatsSection();
            this.uiManager.updateLapInfo({
                currentLap: 0,
                totalTime: 0,
                targetLaps: this.settingsManager.getSetting('targetLaps') || 3,
                lapDetails: [],
                recentLapsStats: { hasEnoughData: false },
                showStatsSection: false
            });

            this.debugManager.addDebugInfo('🔄 数据已重置（后端处理）');

            this.triggerEvent('dataReset', {
                timestamp: this.safeGet(data, 'timestamp', Date.now())
            });

        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 处理数据重置错误: ${error.message}`);
        }
    }

    /**
     * 处理单个设置更新
     */
    handleSettingUpdate(data) {
        try {
            const key = this.safeGet(data, 'key', '');
            const value = this.safeGet(data, 'value', null);

            if (key) {
                this.settingsManager.updateSettingFromBackend(key, value);
                this.debugManager.addDebugInfo(`⚙️ 收到后端设置更新: ${key} = ${value}`);
            } else {
                this.debugManager.addDebugInfo('⚠️ 收到无效的设置更新数据');
            }
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 处理设置更新错误: ${error.message}`);
        }
    }

    /**
     * 处理全量设置更新
     */
    handleSettingsUpdate(data) {
        try {
            const settings = this.safeGet(data, 'settings', {});
            if (Object.keys(settings).length > 0) {
                this.settingsManager.receiveBackendSettings(settings);
                this.debugManager.addDebugInfo('⚙️ 收到后端全量设置更新');
            }
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 处理全量设置更新错误: ${error.message}`);
        }
    }

    /**
     * 处理错误消息
     */
    handleErrorMessage(data) {
        try {
            const message = this.safeGet(data, 'message', '未知错误');
            this.debugManager.addDebugInfo(`❌ 服务器错误: ${message}`);
            this.uiManager.showErrorMessage(message);
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 处理错误消息失败: ${error.message}`);
        }
    }

    /**
     * 向后端发送设置更新请求
     */
    updateBackendSetting(key, value) {
        try {
            const message = {
                type: 'setting_update',
                key: key,
                value: value
            };

            this.triggerEvent('sendToBackend', message);
            this.debugManager.addDebugInfo(`📤 发送设置更新到后端: ${key} = ${value}`);
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 发送设置更新错误: ${error.message}`);
        }
    }

    /**
     * 请求后端重置数据
     */
    resetLapData() {
        try {
            const message = {
                type: 'reset_data'
            };

            this.triggerEvent('sendToBackend', message);
            this.debugManager.addDebugInfo('📤 请求后端重置数据');
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 请求重置数据错误: ${error.message}`);
        }
    }

    /**
     * 请求后端统计数据
     */
    requestStats() {
        try {
            const message = {
                type: 'get_stats'
            };

            this.triggerEvent('sendToBackend', message);
            this.debugManager.addDebugInfo('📤 请求后端统计数据');
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 请求统计数据错误: ${error.message}`);
        }
    }

    /**
     * 请求内存使用情况
     */
    requestMemoryUsage() {
        try {
            const message = {
                type: 'get_memory_usage'
            };

            this.triggerEvent('sendToBackend', message);
            this.debugManager.addDebugInfo('📤 请求内存使用情况');
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 请求内存使用错误: ${error.message}`);
        }
    }

    /**
     * 处理统计响应
     */
    handleStatsResponse(data) {
        try {
            const stats = this.safeGet(data, 'stats', {});
            this.debugManager.addDebugInfo(`📈 收到统计数据: ${Object.keys(stats).length} 项`);
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 处理统计响应错误: ${error.message}`);
        }
    }

    /**
     * 处理内存使用响应
     */
    handleMemoryUsageResponse(data) {
        try {
            const memoryUsage = this.safeGet(data, 'memoryUsage', {});
            console.log('内存使用情况:', memoryUsage);
            this.debugManager.addDebugInfo(`💾 内存使用: ${JSON.stringify(memoryUsage)}`);
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 处理内存使用响应错误: ${error.message}`);
        }
    }

    /**
     * 获取当前状态（用于UI显示）
     */
    getCurrentState() {
        return { ...this.currentState };
    }

    /**
     * 获取当前圈数信息（兼容原有接口）
     */
    getCurrentLapInfo() {
        try {
            if (!this.currentState.lapInfo) {
                return {
                    currentLap: this.currentState.lapCount || 0,
                    totalTime: this.currentState.totalTime || 0,
                    targetLaps: this.settingsManager.getSetting('targetLaps') || 3,
                    lapDetails: [],
                    recentLapsStats: { hasEnoughData: false },
                    showStatsSection: false
                };
            }

            return {
                currentLap: this.currentState.lapCount || 0,
                totalTime: this.currentState.totalTime || 0,
                targetLaps: this.settingsManager.getSetting('targetLaps') || 3,
                lapDetails: this.safeGet(this.currentState.lapInfo, 'lapDetails', []),
                recentLapsStats: this.currentState.recentStats || { hasEnoughData: false },
                showStatsSection: (this.currentState.lapCount || 0) >= (this.settingsManager.getSetting('targetLaps') || 3)
            };
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 获取当前圈数信息错误: ${error.message}`);
            return {
                currentLap: 0,
                totalTime: 0,
                targetLaps: 3,
                lapDetails: [],
                recentLapsStats: { hasEnoughData: false },
                showStatsSection: false
            };
        }
    }

    /**
     * 获取最新的速度数据（用于图表）
     */
    getLatestVelocityData() {
        return this.currentState.latestVelocity ? [this.currentState.latestVelocity] : [];
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

    /**
     * 兼容性方法 - 处理数据（现在只是转发到processBackendData）
     */
    processData(t, jsonData) {
        this.debugManager.addDebugInfo('⚠️ 前端processData被调用，数据处理应在后端进行');
    }

    /**
     * 调试工具：打印当前状态
     */
    debugCurrentState() {
        console.log('Current State:', this.currentState);
        this.debugManager.addDebugInfo('🔍 当前状态已输出到控制台');
    }
}
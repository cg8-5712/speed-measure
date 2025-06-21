/**
 * 前端数据处理器（增强调试版）
 * 主要负责接收后端处理好的数据并触发UI更新
 * 增加详细的调试信息来解决数据字段缺失问题
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

        this.debugManager.addDebugInfo('📊 前端数据处理器已初始化（增强调试版）');
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
     * 调试数据结构
     */
    debugDataStructure(data, prefix = '') {
        console.log(`${prefix}数据结构调试:`, data);

        if (typeof data === 'object' && data !== null) {
            console.log(`${prefix}数据类型: object`);
            console.log(`${prefix}数据键名:`, Object.keys(data));

            for (const [key, value] of Object.entries(data)) {
                console.log(`${prefix}  ${key}: ${value} (类型: ${typeof value})`);

                // 如果值也是对象，递归打印一层
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    console.log(`${prefix}    ${key} 的子键:`, Object.keys(value));
                }
            }
        } else {
            console.log(`${prefix}数据类型:`, typeof data);
            console.log(`${prefix}数据值:`, data);
        }
    }

    /**
     * 验证数据结构
     */
    validateData(data, requiredFields) {
        console.log('🔍 开始验证数据结构...');
        console.log('🔍 必需字段:', requiredFields);
        console.log('🔍 收到的数据:', data);

        this.debugDataStructure(data, '🔍 ');

        const missingFields = [];
        const presentFields = [];

        for (const field of requiredFields) {
            const value = this.safeGet(data, field);
            if (value === null || value === undefined) {
                missingFields.push(field);
                console.log(`🔍 ❌ 缺少字段: ${field}`);
            } else {
                presentFields.push(field);
                console.log(`🔍 ✅ 存在字段: ${field} = ${value}`);
            }
        }

        console.log('🔍 存在的字段:', presentFields);
        console.log('🔍 缺少的字段:', missingFields);

        if (missingFields.length > 0) {
            this.debugManager.addDebugInfo(`⚠️ 数据验证失败，缺少字段: ${missingFields.join(', ')}`);
            this.debugManager.addDebugInfo(`⚠️ 存在的字段: ${presentFields.join(', ')}`);
            return false;
        }

        console.log('🔍 ✅ 数据验证通过');
        return true;
    }

    /**
     * 处理从后端WebSocket接收到的已处理数据
     */
    processBackendData(data) {
        try {
            console.log('📥 收到后端数据:', data);
            this.debugDataStructure(data, '📥 ');

            const messageType = this.safeGet(data, 'type', 'unknown');

            console.log(`📥 消息类型: ${messageType}`);
            this.debugManager.addDebugInfo(`📥 收到后端数据，类型: ${messageType}`);

            switch (messageType) {
                case 'lap_data':
                    console.log('📥 处理圈数据...');
                    this.handleLapData(data);
                    break;

                case 'debug':
                    console.log('📥 处理调试消息...');
                    this.handleDebugMessage(data);
                    break;

                case 'data_reset':
                    console.log('📥 处理数据重置...');
                    this.handleDataReset(data);
                    break;

                case 'setting_updated':
                    console.log('📥 处理设置更新...');
                    this.handleSettingUpdate(data);
                    break;

                case 'settings_update':
                    console.log('📥 处理全量设置更新...');
                    this.handleSettingsUpdate(data);
                    break;

                case 'export_data_response':
                    console.log('📥 处理导出数据响应...');
                    this.handleExportData(data);
                    break;

                case 'stats_response':
                    console.log('📥 处理统计响应...');
                    this.handleStatsResponse(data);
                    break;

                default:
                    console.log(`📥 ⚠️ 未知的消息类型: ${messageType}`);
                    this.debugManager.addDebugInfo(`⚠️ 未知的消息类型: ${messageType}`);
                    this.debugDataStructure(data, '⚠️ 未知数据: ');
            }
        } catch (error) {
            console.error('❌ 处理后端数据错误:', error, data);
            this.debugManager.addDebugInfo(`❌ 处理后端数据错误: ${error.message}`);
        }
    }

    /**
     * 处理圈数据
     */
    handleLapData(data) {
        try {
            console.log('🔍 开始处理圈数据...');
            console.log('🔍 原始圈数据:', data);
            this.debugDataStructure(data, '🔍 圈数据: ');

            // 先检查基本的消息类型
            if (this.safeGet(data, 'type') !== 'lap_data') {
                console.log('❌ 不是圈数据类型，跳过处理');
                this.debugManager.addDebugInfo(`❌ 收到非圈数据类型的消息: ${this.safeGet(data, 'type')}`);
                return;
            }

            // 验证必需字段（使用驼峰命名）
            const requiredFields = ['lapCount', 'totalTime'];
            if (!this.validateData(data, requiredFields)) {
                console.log('❌ 圈数据验证失败，但继续尝试处理...');
                this.debugManager.addDebugInfo('❌ 圈数据验证失败，尝试使用默认值');

                // 尝试查找可能的替代字段名
                const alternativeFields = {
                    'lapCount': ['lap_count', 'laps', 'currentLap'],
                    'totalTime': ['total_time', 'time', 'totalDuration']
                };

                console.log('🔍 尝试查找替代字段名...');
                for (const [required, alternatives] of Object.entries(alternativeFields)) {
                    if (this.safeGet(data, required) === null) {
                        for (const alt of alternatives) {
                            const altValue = this.safeGet(data, alt);
                            if (altValue !== null) {
                                console.log(`🔍 找到替代字段: ${required} -> ${alt} = ${altValue}`);
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

            console.log('🔍 提取的数据值:');
            console.log(`🔍   lapCount: ${lapCount} (类型: ${typeof lapCount})`);
            console.log(`🔍   totalTime: ${totalTime} (类型: ${typeof totalTime})`);
            console.log(`🔍   lapTime: ${lapTime} (类型: ${typeof lapTime})`);
            console.log(`🔍   velocity:`, velocity);
            console.log(`🔍   lapInfo keys:`, lapInfo ? Object.keys(lapInfo) : 'null');
            console.log(`🔍   recentStats keys:`, recentStats ? Object.keys(recentStats) : 'null');

            // 更新当前状态
            this.currentState = {
                lapCount: lapCount,
                totalTime: totalTime,
                latestVelocity: velocity,
                lapInfo: lapInfo,
                recentStats: recentStats
            };

            console.log('🔍 更新后的当前状态:', this.currentState);

            this.debugManager.addDebugInfo(
                `📊 收到第${lapCount}圈数据，用时: ${this.safeFormatNumber(lapTime)}ms`
            );

            // 更新UI
            console.log('🔍 开始更新UI...');
            this.updateUI(data);

            // 触发数据更新事件（用于图表更新）
            console.log('🔍 触发数据更新事件...');
            this.triggerEvent('dataUpdated', {
                lapCount: lapCount,
                lapTime: lapTime,
                totalTime: totalTime,
                velocity: velocity,
                lapDetails: this.safeGet(lapInfo, 'lapDetails', []),
                recentLaps: recentStats
            });

            console.log('✅ 圈数据处理完成');

        } catch (error) {
            console.error('❌ 处理圈数据错误:', error, data);
            this.debugManager.addDebugInfo(`❌ 处理圈数据错误: ${error.message}`);
        }
    }

    /**
     * 更新UI
     */
    updateUI(data) {
        try {
            console.log('🔍 UI更新开始...');

            const lapCount = this.safeGet(data, 'lapCount', 0);
            const totalTime = this.safeGet(data, 'totalTime', 0);
            const lapInfo = this.safeGet(data, 'lapInfo', {});
            const recentStats = this.safeGet(data, 'recentStats', {});
            const showStatsSection = this.safeGet(data, 'showStatsSection', false);

            console.log('🔍 UI更新参数:');
            console.log(`🔍   lapCount: ${lapCount}`);
            console.log(`🔍   totalTime: ${totalTime}`);
            console.log(`🔍   showStatsSection: ${showStatsSection}`);

            // 构造UI更新数据
            const uiData = {
                currentLap: lapCount,
                totalTime: totalTime,
                targetLaps: this.settingsManager.getSetting('targetLaps') || 3,
                lapDetails: this.safeGet(lapInfo, 'lapDetails', []),
                recentLapsStats: recentStats,
                showStatsSection: showStatsSection
            };

            console.log('🔍 构造的UI数据:', uiData);

            // 更新UI
            this.uiManager.updateLapInfo(uiData);

            console.log('✅ UI更新完成');

        } catch (error) {
            console.error('❌ 更新UI错误:', error);
            this.debugManager.addDebugInfo(`❌ 更新UI错误: ${error.message}`);
        }
    }

    /**
     * 处理调试消息
     */
    handleDebugMessage(data) {
        try {
            const message = this.safeGet(data, 'message', '未知调试消息');
            console.log('🔍 处理调试消息:', message);
            this.debugManager.addDebugInfo(`🔍 后端: ${message}`);
        } catch (error) {
            console.error('❌ 处理调试消息错误:', error);
            this.debugManager.addDebugInfo(`❌ 处理调试消息错误: ${error.message}`);
        }
    }

    /**
     * 处理数据重置
     */
    handleDataReset(data) {
        try {
            console.log('🔍 处理数据重置...');

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

            console.log('✅ 数据重置完成');
            this.debugManager.addDebugInfo('🔄 数据已重置（后端处理）');

            this.triggerEvent('dataReset', {
                timestamp: this.safeGet(data, 'timestamp', Date.now())
            });

        } catch (error) {
            console.error('❌ 处理数据重置错误:', error);
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

            console.log(`🔍 处理设置更新: ${key} = ${value}`);

            if (key) {
                this.settingsManager.updateSettingFromBackend(key, value);
                this.debugManager.addDebugInfo(`⚙️ 收到后端设置更新: ${key} = ${value}`);
            } else {
                this.debugManager.addDebugInfo('⚠️ 收到无效的设置更新数据');
            }
        } catch (error) {
            console.error('❌ 处理设置更新错误:', error);
            this.debugManager.addDebugInfo(`❌ 处理设置更新错误: ${error.message}`);
        }
    }

    /**
     * 处理全量设置更新
     */
    handleSettingsUpdate(data) {
        try {
            const settings = this.safeGet(data, 'settings', {});
            console.log('🔍 处理全量设置更新:', settings);

            if (Object.keys(settings).length > 0) {
                this.settingsManager.receiveBackendSettings(settings);
                this.debugManager.addDebugInfo('⚙️ 收到后端全量设置更新');
                this.debugManager.addDebugInfo(`⚙️ 设置内容: ${JSON.stringify(settings)}`);
            }
        } catch (error) {
            console.error('❌ 处理全量设置更新错误:', error);
            this.debugManager.addDebugInfo(`❌ 处理全量设置更新错误: ${error.message}`);
        }
    }

    /**
     * 处理导出数据响应
     */
    handleExportData(data) {
        try {
            const exportData = this.safeGet(data, 'data', {});

            if (Object.keys(exportData).length > 0) {
                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });

                const link = document.createElement('a');
                link.href = URL.createObjectURL(dataBlob);
                link.download = `speed-monitor-data-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
                link.click();

                this.debugManager.addDebugInfo('📤 数据已导出（后端生成）');
            } else {
                this.debugManager.addDebugInfo('⚠️ 导出数据为空');
            }
        } catch (error) {
            console.error('❌ 处理导出数据错误:', error);
            this.debugManager.addDebugInfo(`❌ 处理导出数据错误: ${error.message}`);
        }
    }

    /**
     * 处理统计响应
     */
    handleStatsResponse(data) {
        try {
            const stats = this.safeGet(data, 'stats', {});
            console.log('🔍 收到统计数据:', stats);
            this.debugManager.addDebugInfo(`📈 收到统计数据: ${Object.keys(stats).length} 项`);
        } catch (error) {
            console.error('❌ 处理统计响应错误:', error);
            this.debugManager.addDebugInfo(`❌ 处理统计响应错误: ${error.message}`);
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

            console.log('📤 发送设置更新到后端:', message);
            this.triggerEvent('sendToBackend', message);
            this.debugManager.addDebugInfo(`📤 发送设置更新到后端: ${key} = ${value}`);
        } catch (error) {
            console.error('❌ 发送设置更新错误:', error);
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

            console.log('📤 请求后端重置数据:', message);
            this.triggerEvent('sendToBackend', message);
            this.debugManager.addDebugInfo('📤 请求后端重置数据');
        } catch (error) {
            console.error('❌ 请求重置数据错误:', error);
            this.debugManager.addDebugInfo(`❌ 请求重置数据错误: ${error.message}`);
        }
    }

    /**
     * 请求后端导出数据
     */
    exportData() {
        try {
            const message = {
                type: 'export_data'
            };

            this.triggerEvent('sendToBackend', message);
            this.debugManager.addDebugInfo('📤 请求后端导出数据');
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 请求导出数据错误: ${error.message}`);
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
            console.error('❌ 获取当前圈数信息错误:', error);
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
                    console.error('❌ 事件回调执行失败:', error);
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
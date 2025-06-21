/**
 * 设置管理器（修复版）
 * 负责处理应用程序的所有设置和配置
 * 修复设置更新循环和同步问题
 */
export class SettingsManager {
    constructor(debugManager) {
        this.debugManager = debugManager;

        // 默认设置
        this.defaultSettings = {
            targetLaps: 3,
            lapDisplayLimit: 1000,
            debugDisplayLimit: 1000,
            showDebugInfo: true
        };

        // 当前设置
        this.settings = { ...this.defaultSettings };

        // 设置变更回调
        this.callbacks = new Map();

        // WebSocket管理器引用（稍后通过setWebSocketManager设置）
        this.webSocketManager = null;

        // 防止循环更新的标志
        this.isUpdatingFromBackend = false;
    }

    /**
     * 设置WebSocket管理器引用
     */
    setWebSocketManager(webSocketManager) {
        this.webSocketManager = webSocketManager;
        console.log('🔗 WebSocket管理器已连接到设置管理器');
    }

    /**
     * 初始化设置管理器
     */
    initialize() {
        this.loadSettings();
        this.setupEventListeners();
        this.updateSettingsUI();
        this.debugManager.addDebugInfo('⚙️ 设置管理器已初始化（修复版）');
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 系统按钮控制监听
        document.getElementById('settingsButton')?.addEventListener('click', () => {
            this.openSettings();
        });

        document.getElementById('closeSettingsButton')?.addEventListener('click', () => {
            this.closeSettings();
        });

        document.getElementById('resetDataButton')?.addEventListener('click', () => {
            this.resetLapData();
            this.closeSettings();
        });

        // 页脚设置链接
        document.getElementById('openSettingsLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openSettings();
        });

        // 目标圈数设置
        document.getElementById('settingLapNumber')?.addEventListener('change', (e) => {
            const newValue = parseInt(e.target.value) || 3;
            console.log(`🔧 用户改变目标圈数: ${newValue}`);
            this.updateSetting('targetLaps', newValue);
        });

        // 详细信息显示数量设置
        document.getElementById('settingLapDisplayLimit')?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.updateSetting('lapDisplayLimit', value);
            this.updateSliderDisplay('settingLapDisplayValue', value + ' 圈');
        });

        // 调试信息显示数量设置
        document.getElementById('settingDebugDisplayLimit')?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.updateSetting('debugDisplayLimit', value);
            this.updateSliderDisplay('settingDebugDisplayValue', value + ' 条');
        });

        // 调试信息显示开关
        document.getElementById('settingShowDebug')?.addEventListener('change', (e) => {
            this.updateSetting('showDebugInfo', e.target.checked);
        });
    }

    /**
     * 重置圈数数据（通过后端）
     */
    resetLapData() {
        if (this.webSocketManager) {
            this.webSocketManager.requestDataReset();
            this.debugManager.addDebugInfo('📤 已请求后端重置数据');
        } else {
            this.debugManager.addDebugInfo('❌ WebSocket管理器未设置，无法重置数据');
        }
    }

    /**
     * 打开设置面板
     */
    openSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'block';
            this.updateSettingsUI();
            this.debugManager.addDebugInfo('⚙️ 打开设置面板');
        }
    }

    /**
     * 关闭设置面板
     */
    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
            this.debugManager.addDebugInfo('⚙️ 关闭设置面板');
        }
    }

    /**
     * 更新设置值（用户主动更改）
     */
    updateSetting(key, value) {
        try {
            // 防止循环更新
            if (this.isUpdatingFromBackend) {
                console.log(`🔄 跳过后端更新期间的设置变更: ${key} = ${value}`);
                return;
            }

            const oldValue = this.settings[key];

            // 检查值是否真的改变了
            if (oldValue === value) {
                console.log(`📋 设置值未改变，跳过更新: ${key} = ${value}`);
                return;
            }

            console.log(`🔧 用户更新设置: ${key} = ${value} (原值: ${oldValue})`);

            this.settings[key] = value;

            // 保存到本地存储
            this.saveSettings();

            // 同步到后端
            if (this.webSocketManager) {
                console.log(`📤 发送设置到后端: ${key} = ${value}`);
                this.webSocketManager.sendSettingUpdate(key, value);
                this.debugManager.addDebugInfo(`📤 设置已发送到后端: ${key} = ${value}`);
            } else {
                this.debugManager.addDebugInfo('⚠️ WebSocket未连接，设置仅保存在本地');
            }

            // 触发本地回调
            this.triggerCallback(key, value, oldValue);

            this.debugManager.addDebugInfo(`⚙️ 设置已更新: ${key} = ${value} (原值: ${oldValue})`);

        } catch (error) {
            console.error('❌ 更新设置错误:', error);
            this.debugManager.addDebugInfo(`❌ 更新设置错误: ${error.message}`);
        }
    }

    /**
     * 从后端更新设置（不触发回调，避免循环）
     */
    updateSettingFromBackend(key, value) {
        try {
            console.log(`📥 从后端接收设置更新: ${key} = ${value}`);

            // 设置标志防止循环
            this.isUpdatingFromBackend = true;

            const oldValue = this.settings[key];
            this.settings[key] = value;

            // 保存到本地存储
            this.saveSettings();

            // 更新UI
            this.updateSettingsUI();

            this.debugManager.addDebugInfo(`📥 从后端更新设置: ${key} = ${value} (原值: ${oldValue})`);

        } catch (error) {
            console.error('❌ 从后端更新设置错误:', error);
            this.debugManager.addDebugInfo(`❌ 从后端更新设置错误: ${error.message}`);
        } finally {
            // 重置标志
            this.isUpdatingFromBackend = false;
        }
    }

    /**
     * 获取设置值
     */
    getSetting(key) {
        return this.settings[key];
    }

    /**
     * 获取所有设置
     */
    getAllSettings() {
        return { ...this.settings };
    }

    /**
     * 重置设置为默认值
     */
    resetSettings() {
        console.log('🔄 重置所有设置为默认值');

        this.settings = { ...this.defaultSettings };
        this.saveSettings();
        this.updateSettingsUI();

        // 发送所有设置到后端
        if (this.webSocketManager) {
            Object.entries(this.settings).forEach(([key, value]) => {
                this.webSocketManager.sendSettingUpdate(key, value);
            });
            this.debugManager.addDebugInfo('📤 所有默认设置已发送到后端');
        }

        this.triggerCallback('reset', this.settings, null);
        this.debugManager.addDebugInfo('🔄 设置已重置为默认值');
    }

    /**
     * 加载设置
     */
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('speedMonitorSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                this.settings = { ...this.defaultSettings, ...parsed };
                console.log('📁 从本地存储加载的设置:', this.settings);
                this.debugManager.addDebugInfo('📁 已从本地存储加载设置');
            } else {
                console.log('📁 未找到保存的设置，使用默认值');
                this.debugManager.addDebugInfo('📁 未找到保存的设置，使用默认值');
            }
        } catch (error) {
            console.error('❌ 加载设置失败:', error);
            this.debugManager.addDebugInfo(`❌ 加载设置失败: ${error.message}，使用默认值`);
            this.settings = { ...this.defaultSettings };
        }
    }

    /**
     * 保存设置
     */
    saveSettings() {
        try {
            localStorage.setItem('speedMonitorSettings', JSON.stringify(this.settings));
            localStorage.setItem('speedMonitorSettingsLastModified', new Date().toISOString());
            console.log('💾 设置已保存到本地存储:', this.settings);
            this.debugManager.addDebugInfo('💾 设置已保存到本地存储');
        } catch (error) {
            console.error('❌ 保存设置失败:', error);
            this.debugManager.addDebugInfo(`❌ 保存设置失败: ${error.message}`);
        }
    }

    /**
     * 更新设置UI
     */
    updateSettingsUI() {
        try {
            console.log('🎨 更新设置UI:', this.settings);

            // 更新表单元素
            const elements = {
                'settingLapNumber': this.settings.targetLaps,
                'settingLapDisplayLimit': this.settings.lapDisplayLimit,
                'settingDebugDisplayLimit': this.settings.debugDisplayLimit,
                'settingShowDebug': this.settings.showDebugInfo
            };

            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = value;
                    } else {
                        element.value = value;
                    }
                    console.log(`🎨 更新UI元素 ${id} = ${value}`);
                } else {
                    console.warn(`⚠️ 未找到UI元素: ${id}`);
                }
            });

            // 更新滑块显示
            this.updateSliderDisplay('settingLapDisplayValue', this.settings.lapDisplayLimit + ' 圈');
            this.updateSliderDisplay('settingDebugDisplayValue', this.settings.debugDisplayLimit + ' 条');

            // 更新调试信息显示状态
            const debugDiv = document.getElementById('debugInfo');
            if (debugDiv) {
                debugDiv.style.display = this.settings.showDebugInfo ? 'flex' : 'none';
                console.log(`🎨 调试面板显示: ${this.settings.showDebugInfo ? '显示' : '隐藏'}`);
            }

        } catch (error) {
            console.error('❌ 更新设置UI错误:', error);
            this.debugManager.addDebugInfo(`❌ 更新设置UI错误: ${error.message}`);
        }
    }

    /**
     * 更新滑块显示值
     */
    updateSliderDisplay(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * 从后端接收的全量设置更新
     */
    receiveBackendSettings(backendSettings) {
        try {
            console.log('📥 收到后端全量设置:', backendSettings);

            // 设置标志防止循环
            this.isUpdatingFromBackend = true;

            this.settings = { ...this.defaultSettings, ...backendSettings };
            this.saveSettings();
            this.updateSettingsUI();

            this.debugManager.addDebugInfo('📥 已接收并应用后端设置');

        } catch (error) {
            console.error('❌ 接收后端设置错误:', error);
            this.debugManager.addDebugInfo(`❌ 接收后端设置错误: ${error.message}`);
        } finally {
            // 重置标志
            this.isUpdatingFromBackend = false;
        }
    }

    /**
     * 注册设置变更回调
     */
    onSettingChange(key, callback) {
        if (!this.callbacks.has(key)) {
            this.callbacks.set(key, []);
        }
        this.callbacks.get(key).push(callback);
    }

    /**
     * 移除设置变更回调
     */
    offSettingChange(key, callback) {
        if (this.callbacks.has(key)) {
            const callbacks = this.callbacks.get(key);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 触发设置变更回调
     */
    triggerCallback(key, newValue, oldValue) {
        // 在更新期间不触发回调，避免循环
        if (this.isUpdatingFromBackend) {
            return;
        }

        // 触发特定键的回调
        if (this.callbacks.has(key)) {
            this.callbacks.get(key).forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error('❌ 设置回调执行失败:', error);
                    this.debugManager.addDebugInfo(`❌ 设置回调执行失败: ${error.message}`);
                }
            });
        }

        // 触发通用回调
        if (this.callbacks.has('*')) {
            this.callbacks.get('*').forEach(callback => {
                try {
                    callback(key, newValue, oldValue);
                } catch (error) {
                    console.error('❌ 通用设置回调执行失败:', error);
                    this.debugManager.addDebugInfo(`❌ 通用设置回调执行失败: ${error.message}`);
                }
            });
        }
    }

    /**
     * 导出设置
     */
    exportSettings() {
        try {
            const exportData = {
                settings: this.settings,
                timestamp: new Date().toISOString(),
                version: '1.8.5'
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `speed-monitor-settings-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();

            this.debugManager.addDebugInfo('📤 设置已导出');
        } catch (error) {
            console.error('❌ 导出设置错误:', error);
            this.debugManager.addDebugInfo(`❌ 导出设置错误: ${error.message}`);
        }
    }

    /**
     * 导入设置
     */
    importSettings(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const importData = JSON.parse(e.target.result);

                    if (importData.settings) {
                        this.settings = { ...this.defaultSettings, ...importData.settings };
                        this.saveSettings();
                        this.updateSettingsUI();

                        // 发送所有设置到后端
                        if (this.webSocketManager) {
                            Object.entries(this.settings).forEach(([key, value]) => {
                                this.webSocketManager.sendSettingUpdate(key, value);
                            });
                        }

                        this.triggerCallback('import', this.settings, null);
                        this.debugManager.addDebugInfo('📥 设置已成功导入并同步到后端');
                        resolve(this.settings);
                    } else {
                        throw new Error('无效的设置文件格式');
                    }
                } catch (error) {
                    this.debugManager.addDebugInfo(`❌ 导入设置失败: ${error.message}`);
                    reject(error);
                }
            };

            reader.onerror = () => {
                const error = new Error('文件读取失败');
                this.debugManager.addDebugInfo(`❌ ${error.message}`);
                reject(error);
            };

            reader.readAsText(file);
        });
    }

    /**
     * 获取设置摘要信息
     */
    getSettingsSummary() {
        return {
            totalSettings: Object.keys(this.settings).length,
            modifiedSettings: Object.keys(this.settings).filter(key =>
                this.settings[key] !== this.defaultSettings[key]
            ),
            lastModified: localStorage.getItem('speedMonitorSettingsLastModified') || 'Unknown',
            backendSyncEnabled: !!this.webSocketManager,
            isUpdatingFromBackend: this.isUpdatingFromBackend
        };
    }

    /**
     * 调试方法：打印当前状态
     */
    debugCurrentState() {
        console.log('当前设置状态:', {
            settings: this.settings,
            isUpdatingFromBackend: this.isUpdatingFromBackend,
            webSocketConnected: !!this.webSocketManager,
            callbacks: Array.from(this.callbacks.keys())
        });
    }
}
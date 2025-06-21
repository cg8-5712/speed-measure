/**
 * 设置管理器
 * 负责处理应用程序的所有设置和配置
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
    }

    /**
     * 初始化设置管理器
     */
    initialize() {
        this.loadSettings();
        this.setupEventListeners();
        this.updateSettingsUI();
        this.debugManager.addDebugInfo('⚙️ 设置管理器已初始化');
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 目标圈数设置
        document.getElementById('settingLapNumber').addEventListener('change', (e) => {
            this.updateSetting('targetLaps', parseInt(e.target.value) || 3);
        });

        // 详细信息显示数量设置
        document.getElementById('settingLapDisplayLimit').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.updateSetting('lapDisplayLimit', value);
            this.updateSliderDisplay('settingLapDisplayValue', value + ' 圈');
        });

        // 调试信息显示数量设置
        document.getElementById('settingDebugDisplayLimit').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.updateSetting('debugDisplayLimit', value);
            this.updateSliderDisplay('settingDebugDisplayValue', value + ' 条');
        });

        // 调试信息显示开关
        document.getElementById('settingShowDebug').addEventListener('change', (e) => {
            this.updateSetting('showDebugInfo', e.target.checked);
        });
    }

    /**
     * 更新设置值
     */
    updateSetting(key, value) {
        const oldValue = this.settings[key];
        this.settings[key] = value;

        // 保存到本地存储
        this.saveSettings();

        // 触发回调
        this.triggerCallback(key, value, oldValue);

        this.debugManager.addDebugInfo(`⚙️ 设置已更新: ${key} = ${value} (原值: ${oldValue})`);
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
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
        this.updateSettingsUI();
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
                this.debugManager.addDebugInfo('📁 已从本地存储加载设置');
            } else {
                this.debugManager.addDebugInfo('📁 未找到保存的设置，使用默认值');
            }
        } catch (error) {
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
            this.debugManager.addDebugInfo('💾 设置已保存到本地存储');
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 保存设置失败: ${error.message}`);
        }
    }

    /**
     * 更新设置UI
     */
    updateSettingsUI() {
        // 更新表单元素
        document.getElementById('settingLapNumber').value = this.settings.targetLaps;
        document.getElementById('settingLapDisplayLimit').value = this.settings.lapDisplayLimit;
        document.getElementById('settingDebugDisplayLimit').value = this.settings.debugDisplayLimit;
        document.getElementById('settingShowDebug').checked = this.settings.showDebugInfo;

        // 更新滑块显示
        this.updateSliderDisplay('settingLapDisplayValue', this.settings.lapDisplayLimit + ' 圈');
        this.updateSliderDisplay('settingDebugDisplayValue', this.settings.debugDisplayLimit + ' 条');

        // 更新调试信息显示状态
        const debugDiv = document.getElementById('debugInfo');
        debugDiv.style.display = this.settings.showDebugInfo ? 'flex' : 'none';
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
     * 打开设置模态窗口
     */
    openSettings() {
        document.getElementById('settingsModal').style.display = 'block';
        this.updateSettingsUI();
        this.debugManager.addDebugInfo('⚙️ 打开设置面板');
    }

    /**
     * 关闭设置模态窗口
     */
    closeSettings() {
        document.getElementById('settingsModal').style.display = 'none';
        this.debugManager.addDebugInfo('⚙️ 关闭设置面板');
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
        // 触发特定键的回调
        if (this.callbacks.has(key)) {
            this.callbacks.get(key).forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
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
                    this.debugManager.addDebugInfo(`❌ 通用设置回调执行失败: ${error.message}`);
                }
            });
        }
    }

    /**
     * 导出设置
     */
    exportSettings() {
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
                        this.triggerCallback('import', this.settings, null);
                        this.debugManager.addDebugInfo('📥 设置已成功导入');
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
            lastModified: localStorage.getItem('speedMonitorSettingsLastModified') || 'Unknown'
        };
    }
}
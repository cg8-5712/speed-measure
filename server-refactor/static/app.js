/**
 * 速度监测系统 - 增强版本
 * 增加了图表导出和智能统计功能
 */
class SpeedMonitorApp {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.isMonitoring = false;
        this.chart = null;
        this.lapData = [];
        this.lapCountSetting = 3;
        this.showDebug = true;
        this.showIntelligentStats = true; // 智能统计始终启用
        this.showDetailsView = false; // 默认不显示详细视图
        this.maxDataPoints = 1000; // 增加到1000条数据
        this.maxLapDisplayCount = 1000; // 圈速详细时间最多显示1000条
        this.hasInitialReset = false;

        this.initElements();
        this.initChart();
        this.bindEvents();
        this.initializeDisplay();
        this.addDebugLog('系统初始化完成 - 智能统计功能已启用');

        // 页面加载时自动重置数据
        this.autoResetOnPageLoad();

        // 自动连接WebSocket
        this.connect();

        // 初始化通知样式
        this.initNotificationStyles();
    }

    initElements() {
        // 获取DOM元素
        this.elements = {
            // 连接控制
            status: document.getElementById('status'),
            startButton: document.getElementById('startButton'),
            stopButton: document.getElementById('stopButton'),
            exportChartButton: document.getElementById('exportChartButton'),

            // 详情切换
            toggleDetailsButton: document.getElementById('toggleDetailsButton'),

            // 导出模态窗口
            exportModal: document.getElementById('exportModal'),
            closeExportButton: document.getElementById('closeExportButton'),
            exportChart: document.getElementById('exportChart'),
            exportIntelligentStats: document.getElementById('exportIntelligentStats'),
            exportRelativeAnalysis: document.getElementById('exportRelativeAnalysis'),
            confirmExportButton: document.getElementById('confirmExportButton'),

            // 设置相关
            settingsButton: document.getElementById('settingsButton'),
            settingsModal: document.getElementById('settingsModal'),
            closeSettingsButton: document.getElementById('closeSettingsButton'),
            settingLapNumber: document.getElementById('settingLapNumber'),
            settingShowDebug: document.getElementById('settingShowDebug'),
            resetDataButton: document.getElementById('resetDataButton'),
            openSettingsLink: document.getElementById('openSettingsLink'),

            // 数据显示
            currentLap: document.getElementById('currentLap'),
            totalTime: document.getElementById('totalTime'),
            lapDetails: document.getElementById('lapDetails'),
            recentLapsDetails: document.getElementById('recentLapsDetails'),
            recentLapsDisplayCount: document.getElementById('recentLapsDisplayCount'),

            // 统计信息
            statsSection: document.getElementById('statsSection'),
            recentLapsCount: document.getElementById('recentLapsCount'),
            recentLapsTotal: document.getElementById('recentLapsTotal'),
            bestLapsCount: document.getElementById('bestLapsCount'),
            bestLapsTime: document.getElementById('bestLapsTime'),

            // 智能统计
            intelligentStatsSection: document.getElementById('intelligentStatsSection'),
            fastestComboTime: document.getElementById('fastestComboTime'),
            fastestComboRange: document.getElementById('fastestComboRange'),
            overallAverage: document.getElementById('overallAverage'),
            overallAverageSpeed: document.getElementById('overallAverageSpeed'),
            fastestSingleLap: document.getElementById('fastestSingleLap'),
            fastestSingleLapNumber: document.getElementById('fastestSingleLapNumber'),
            slowestSingleLap: document.getElementById('slowestSingleLap'),
            slowestSingleLapNumber: document.getElementById('slowestSingleLapNumber'),
            timeDifference: document.getElementById('timeDifference'),
            fastestSpeed: document.getElementById('fastestSpeed'),
            fastestSpeedLap: document.getElementById('fastestSpeedLap'),

            // 相对分析
            relativeAnalysisSection: document.getElementById('relativeAnalysisSection'),
            relativeAnalysisTableBody: document.getElementById('relativeAnalysisTableBody'),

            // 图表控制
            exportPngButton: document.getElementById('exportPngButton'),

            // 调试信息
            debugInfo: document.getElementById('debugInfo'),
            debugContent: document.getElementById('debugContent')
        };
    }

    initChart() {
        const ctx = document.getElementById('velocityChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '速度 (m/s)',
                    data: [],
                    borderColor: '#4fc3f7',
                    backgroundColor: 'rgba(79, 195, 247, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#29b6f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '速度 (m/s)'
                        },
                        grid: {
                            color: 'rgba(79, 195, 247, 0.1)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '圈数'
                        },
                        grid: {
                            color: 'rgba(79, 195, 247, 0.1)'
                        }
                    }
                },
                animation: {
                    duration: 500
                }
            }
        });
    }

    initializeDisplay() {
        // 初始化显示状态
        this.elements.debugInfo.style.display = this.showDebug ? 'flex' : 'none';

        // 同步设置复选框状态
        this.elements.settingShowDebug.checked = this.showDebug;

        // 确保详细分析按钮可见性
        this.updateDetailsView();

        this.addDebugLog('系统启动，等待数据输入');
        this.addDebugLog('WebSocket连接中...');

        // 更新初始智能统计（显示空数据状态）
        this.updateIntelligentStats();

        // 确保按钮文本正确
        const buttonText = this.showDetailsView ? '📊 隐藏详细分析' : '📊 显示详细分析';
        this.elements.toggleDetailsButton.textContent = buttonText;

        this.addDebugLog(`初始化完成 - 详细视图: ${this.showDetailsView}`);
    }

    bindEvents() {
        // 连接控制
        this.elements.startButton.addEventListener('click', () => this.startMonitoring());
        this.elements.stopButton.addEventListener('click', () => this.stopMonitoring());
        this.elements.exportChartButton.addEventListener('click', () => this.openExportModal());

        // 详情切换
        this.elements.toggleDetailsButton.addEventListener('click', () => this.toggleDetailsView());

        // 导出模态窗口
        this.elements.closeExportButton.addEventListener('click', () => this.closeExportModal());
        this.elements.confirmExportButton.addEventListener('click', () => this.handleExport());

        // 图表控制
        this.elements.exportPngButton.addEventListener('click', () => this.openExportModal());

        // 设置窗口
        this.elements.settingsButton.addEventListener('click', () => this.openSettings());
        this.elements.closeSettingsButton.addEventListener('click', () => this.closeSettings());
        this.elements.openSettingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.openSettings();
        });

        // 设置项
        this.elements.settingLapNumber.addEventListener('change', () => this.updateLapCountSetting());
        this.elements.settingShowDebug.addEventListener('change', () => this.toggleDebugDisplay());
        this.elements.resetDataButton.addEventListener('click', () => this.resetData());

        // 模态窗口点击外部关闭
        this.elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.closeSettings();
            }
        });

        this.elements.exportModal.addEventListener('click', (e) => {
            if (e.target === this.elements.exportModal) {
                this.closeExportModal();
            }
        });

        // 页面卸载时断开连接并自动重置数据
        window.addEventListener('beforeunload', () => {
            this.autoResetOnPageUnload();
        });
    }

    // 初始化通知样式
    initNotificationStyles() {
        if (!document.getElementById('notification-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'notification-styles';
            styleElement.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }

                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: auto;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                }

                .notification-close:hover {
                    opacity: 1;
                }

                .progress-bar {
                    height: 6px;
                    background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
                    width: 0%;
                    transition: width 2s ease;
                    border-radius: 3px;
                }
            `;
            document.head.appendChild(styleElement);
        }
    }

    // 切换详细视图显示
    toggleDetailsView() {
        this.showDetailsView = !this.showDetailsView;

        this.addDebugLog(`用户切换详细分析视图: ${this.showDetailsView ? '显示' : '隐藏'}`);
        this.addDebugLog(`当前智能统计功能状态: ${this.showIntelligentStats ? '启用' : '禁用'}`);

        this.updateDetailsView();

        const buttonText = this.showDetailsView ? '📊 隐藏详细分析' : '📊 显示详细分析';
        this.elements.toggleDetailsButton.textContent = buttonText;
    }

    // 更新详细视图显示状态
    updateDetailsView() {
        this.addDebugLog(`更新详细视图 - showDetailsView: ${this.showDetailsView}`);

        const display = this.showDetailsView ? 'block' : 'none';
        this.elements.intelligentStatsSection.style.display = display;
        this.elements.relativeAnalysisSection.style.display = display;

        this.addDebugLog(`设置详细分析显示状态: ${display}`);

        // 如果显示详细视图，立即更新统计数据
        if (this.showDetailsView) {
            this.addDebugLog('更新智能统计数据...');
            this.updateIntelligentStats();
        }
    }

    // 改进的导出模态窗口处理
    openExportModal() {
        // 检查是否有数据可导出
        if (this.lapData.length === 0) {
            this.showNotification('暂无数据可导出，请先开始监测并记录一些圈速数据！', 'warning');
            return;
        }

        this.elements.exportModal.style.display = 'block';

        // 自动选择合适的默认选项
        this.elements.exportChart.checked = true;
        this.elements.exportIntelligentStats.checked = this.lapData.length >= 3;
        this.elements.exportRelativeAnalysis.checked = this.lapData.length >= 5;

        this.addDebugLog(`打开导出窗口 - 数据量: ${this.lapData.length}圈`);
    }

    // 关闭导出模态窗口
    closeExportModal() {
        this.elements.exportModal.style.display = 'none';
    }

    // 改进的导出内容处理
    handleExport() {
        const exportChart = this.elements.exportChart.checked;
        const exportIntelligentStats = this.elements.exportIntelligentStats.checked;
        const exportRelativeAnalysis = this.elements.exportRelativeAnalysis.checked;

        if (!exportChart && !exportIntelligentStats && !exportRelativeAnalysis) {
            this.showNotification('请至少选择一项内容进行导出！', 'error');
            return;
        }

        // 显示导出进度
        this.showExportProgress();
        this.closeExportModal();

        // 延迟执行导出以显示进度
        setTimeout(() => {
            this.exportSelectedContent(exportChart, exportIntelligentStats, exportRelativeAnalysis);
        }, 100);
    }

    // 显示导出进度
    showExportProgress() {
        const progressModal = this.createProgressModal();
        document.body.appendChild(progressModal);

        // 自动关闭进度窗口
        setTimeout(() => {
            if (progressModal.parentNode) {
                progressModal.parentNode.removeChild(progressModal);
            }
        }, 3000);
    }

    // 创建进度模态窗口
    createProgressModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <div style="padding: 20px;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">📊</div>
                    <h3 style="color: #37474f; margin-bottom: 10px;">正在导出数据...</h3>
                    <div style="width: 100%; background: #e0f2f1; border-radius: 10px; overflow: hidden; margin: 20px 0;">
                        <div class="progress-bar" style="height: 6px; background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%); width: 0%; transition: width 2s ease;"></div>
                    </div>
                    <p style="color: #78909c; font-size: 0.9rem;">请稍候，正在生成报告...</p>
                </div>
            </div>
        `;

        // 启动进度条动画
        setTimeout(() => {
            const progressBar = modal.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = '100%';
            }
        }, 100);

        return modal;
    }

    // 改进的导出选定内容方法
    exportSelectedContent(includeChart, includeIntelligentStats, includeRelativeAnalysis) {
        if (!this.chart) {
            this.showNotification('图表未初始化，无法导出', 'error');
            return;
        }

        try {
            this.addDebugLog('开始生成导出内容...');

            // 获取统计数据
            const stats = this.calculateIntelligentStats();
            const exportInfo = this.getExportInfo(includeChart, includeIntelligentStats, includeRelativeAnalysis);

            // 创建导出canvas
            const canvas = this.createExportCanvas(exportInfo);

            if (includeChart) {
                this.exportWithChart(canvas, stats, includeIntelligentStats, includeRelativeAnalysis, exportInfo);
            } else {
                this.exportWithoutChart(canvas, stats, includeIntelligentStats, includeRelativeAnalysis, exportInfo);
            }

        } catch (error) {
            this.addDebugLog(`导出失败: ${error.message}`, 'error');
            this.showNotification(`导出失败: ${error.message}`, 'error');
        }
    }

    // 获取导出信息
    getExportInfo(includeChart, includeIntelligentStats, includeRelativeAnalysis) {
        const exportTypes = [];
        if (includeChart) exportTypes.push('chart');
        if (includeIntelligentStats) exportTypes.push('stats');
        if (includeRelativeAnalysis) exportTypes.push('analysis');

        let canvasHeight = 200; // 基础高度
        if (includeChart) canvasHeight += 450;
        if (includeIntelligentStats) canvasHeight += 300;
        if (includeRelativeAnalysis) canvasHeight += Math.min(400, this.lapData.length * 25 + 100);

        return {
            types: exportTypes,
            filename: `speed_monitor_${exportTypes.join('_')}_${new Date().toISOString().slice(0, 16).replace(/[:.]/g, '-')}.png`,
            height: canvasHeight
        };
    }

    // 创建导出canvas
    createExportCanvas(exportInfo) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = 1200;
        canvas.height = exportInfo.height;

        // 设置高质量渲染
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 设置白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        return canvas;
    }

    // 带图表的导出
    exportWithChart(canvas, stats, includeIntelligentStats, includeRelativeAnalysis, exportInfo) {
        const ctx = canvas.getContext('2d');

        // 绘制标题和基础信息
        let currentY = this.drawExportHeader(ctx, exportInfo);

        // 获取图表图像
        const chartCanvas = this.chart.canvas;
        const chartImage = new Image();

        chartImage.onload = () => {
            // 绘制图表
            ctx.drawImage(chartImage, 50, currentY, 1100, 400);
            currentY += 450;

            // 继续绘制其他内容
            this.finishExport(ctx, canvas, stats, includeIntelligentStats, includeRelativeAnalysis, currentY, exportInfo);
        };

        chartImage.onerror = () => {
            this.addDebugLog('图表加载失败，跳过图表导出', 'error');
            this.finishExport(ctx, canvas, stats, includeIntelligentStats, includeRelativeAnalysis, currentY, exportInfo);
        };

        chartImage.src = chartCanvas.toDataURL('image/png', 1.0);
    }

    // 无图表的导出
    exportWithoutChart(canvas, stats, includeIntelligentStats, includeRelativeAnalysis, exportInfo) {
        const ctx = canvas.getContext('2d');
        const currentY = this.drawExportHeader(ctx, exportInfo);
        this.finishExport(ctx, canvas, stats, includeIntelligentStats, includeRelativeAnalysis, currentY, exportInfo);
    }

    // 绘制导出标题
    drawExportHeader(ctx, exportInfo) {
        const timestamp = new Date().toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // 主标题
        ctx.fillStyle = '#37474f';
        ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏎️ 速度监测系统 - 数据分析报告', 600, 40);

        // 时间戳
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif';
        ctx.fillText(`导出时间: ${timestamp}`, 600, 70);

        // 数据摘要
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif';
        ctx.fillText(`数据范围: 共${this.lapData.length}圈 | 导出内容: ${this.getExportTypeNames(exportInfo.types).join(' + ')}`, 600, 100);

        // 分割线
        ctx.strokeStyle = '#e0f2f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(50, 120);
        ctx.lineTo(1150, 120);
        ctx.stroke();

        return 140;
    }

    // 获取导出类型名称
    getExportTypeNames(types) {
        const nameMap = {
            chart: '图表',
            stats: '智能统计',
            analysis: '相对分析'
        };
        return types.map(type => nameMap[type] || type);
    }

    // 完成导出
    finishExport(ctx, canvas, stats, includeIntelligentStats, includeRelativeAnalysis, startY, exportInfo) {
        let currentY = startY;

        // 绘制智能统计
        if (includeIntelligentStats) {
            currentY = this.drawIntelligentStatsSection(ctx, stats, currentY);
        }

        // 绘制相对分析表格
        if (includeRelativeAnalysis && this.lapData.length > 0) {
            currentY = this.drawRelativeAnalysisSection(ctx, currentY);
        }

        // 添加页脚
        this.drawExportFooter(ctx, canvas.height);

        // 导出文件
        this.downloadCanvas(canvas, exportInfo.filename);

        this.addDebugLog(`报告已成功导出: ${exportInfo.filename}`);
        this.showNotification(`报告已导出为: ${exportInfo.filename}`, 'success');
    }

    // 绘制智能统计部分
    drawIntelligentStatsSection(ctx, stats, startY) {
        ctx.fillStyle = '#37474f';
        ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🧠 智能统计分析', 50, startY);

        // 背景框
        ctx.fillStyle = 'rgba(255, 112, 67, 0.1)';
        ctx.fillRect(50, startY + 10, 1100, 200);

        // 统计数据
        ctx.fillStyle = '#37474f';
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif';

        const leftCol = 80;
        const rightCol = 620;
        let y = startY + 50;

        // 左列
        const leftStats = [
            `📊 数据范围: ${stats.lapRange}`,
            `⏱️ 总用时: ${stats.totalTime}`,
            `📈 平均每圈: ${stats.averageTime}`,
            `🏎️ 平均速度: ${stats.averageSpeed}`,
            `⚡ 最快速度: ${stats.maxSpeed}`
        ];

        leftStats.forEach(stat => {
            ctx.fillText(stat, leftCol, y);
            y += 30;
        });

        // 右列
        y = startY + 50;
        const rightStats = [
            `🏆 最快单圈: ${stats.fastestLap}`,
            `🐌 最慢单圈: ${stats.slowestLap}`,
            `📏 时间差值: ${stats.timeDifference}`,
            `🔥 最快组合: ${stats.fastestCombo}`,
            `📍 组合范围: ${stats.fastestComboRange}`
        ];

        rightStats.forEach(stat => {
            ctx.fillText(stat, rightCol, y);
            y += 30;
        });

        return startY + 240;
    }

    // 绘制相对分析部分
    drawRelativeAnalysisSection(ctx, startY) {
        ctx.fillStyle = '#37474f';
        ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('📈 相对分析表格', 50, startY);

        const times = this.lapData.map(lap => lap.time);
        const fastestTime = Math.min(...times);

        // 表格设置
        const tableStartY = startY + 40;
        const rowHeight = 25;
        const colWidths = [150, 150, 150, 200, 150];
        const colStartX = [50, 200, 350, 500, 700];

        // 表头
        ctx.fillStyle = 'rgba(79, 195, 247, 0.2)';
        ctx.fillRect(50, tableStartY - 5, 800, rowHeight);

        ctx.fillStyle = '#37474f';
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif';
        ctx.textAlign = 'center';

        const headers = ['圈数', '圈速 (s)', '速度 (m/s)', '相对最快圈 (s)', '百分比差值'];
        headers.forEach((header, i) => {
            ctx.fillText(header, colStartX[i] + colWidths[i] / 2, tableStartY + 15);
        });

        // 数据行
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif';
        let currentRowY = tableStartY + rowHeight + 5;

        // 限制显示行数
        const maxRows = Math.min(this.lapData.length, 12);
        const displayData = this.lapData.slice(0, maxRows);

        displayData.forEach((lap, index) => {
            const timeDiff = lap.time - fastestTime;
            const percentDiff = ((lap.time - fastestTime) / fastestTime * 100);
            const isFastest = lap.time === fastestTime;

            // 最快圈高亮
            if (isFastest) {
                ctx.fillStyle = 'rgba(77, 182, 172, 0.3)';
                ctx.fillRect(50, currentRowY - 15, 800, rowHeight);
            }

            ctx.fillStyle = '#37474f';

            const rowData = [
                `第${lap.lap}圈`,
                lap.time.toFixed(3),
                lap.speed.toFixed(2),
                isFastest ? '0.000' : '+' + timeDiff.toFixed(3),
                isFastest ? '0.0%' : '+' + percentDiff.toFixed(1) + '%'
            ];

            rowData.forEach((data, i) => {
                ctx.fillText(data, colStartX[i] + colWidths[i] / 2, currentRowY + 5);
            });

            currentRowY += rowHeight;
        });

        // 如果数据被截断，显示提示
        if (this.lapData.length > maxRows) {
            ctx.fillStyle = '#ff7043';
            ctx.font = 'italic 12px -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`显示前${maxRows}圈数据，共${this.lapData.length}圈`, 450, currentRowY + 20);
            currentRowY += 40;
        }

        return currentRowY + 20;
    }

    // 绘制页脚
    drawExportFooter(ctx, canvasHeight) {
        const footerY = canvasHeight - 40;

        // 分割线
        ctx.strokeStyle = '#e0f2f1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, footerY - 20);
        ctx.lineTo(1150, footerY - 20);
        ctx.stroke();

        // 页脚文本
        ctx.fillStyle = '#78909c';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Generated by 速度监测系统 v2.1.0 | Powered by G2-13 Dong Zhicheng & G1-12 Tan Xinmin', 600, footerY);
    }

    // 下载canvas
    downloadCanvas(canvas, filename) {
        try {
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png', 1.0);

            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.addDebugLog(`文件下载已触发: ${filename}`);
        } catch (error) {
            this.addDebugLog(`下载失败: ${error.message}`, 'error');
            this.showNotification('下载失败，请检查浏览器权限', 'error');
        }
    }

    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // 自动移除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, type === 'error' ? 5000 : 3000);
    }

    // 获取通知图标
    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // 获取通知颜色
    getNotificationColor(type) {
        const colors = {
            success: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
            error: 'linear-gradient(135deg, #f44336 0%, #da190b 100%)',
            warning: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
            info: 'linear-gradient(135deg, #2196f3 0%, #0d8bf2 100%)'
        };
        return colors[type] || colors.info;
    }

    // 快速导出图表（保留原有功能的简化版本）
    exportChartImage() {
        if (this.lapData.length === 0) {
            this.showNotification('暂无数据可导出！', 'warning');
            return;
        }

        this.exportSelectedContent(true, false, false);
    }

    // 计算智能统计数据
    calculateIntelligentStats() {
        if (this.lapData.length === 0) {
            return {
                lapRange: '无数据',
                totalTime: '0.000s',
                averageTime: '0.000s',
                averageSpeed: '0.00 m/s',
                maxSpeed: '0.00 m/s',
                fastestLap: '0.000s',
                slowestLap: '0.000s',
                timeDifference: '0.000s',
                fastestCombo: '0.000s',
                fastestComboRange: '无数据'
            };
        }

        const times = this.lapData.map(lap => lap.time);
        const speeds = this.lapData.map(lap => lap.speed);

        const totalTime = times.reduce((sum, time) => sum + time, 0);
        const averageTime = totalTime / times.length;
        const averageSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
        const maxSpeed = Math.max(...speeds);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        // 计算最快连续组合
        const fastestCombo = this.findFastestContinuousLaps(this.lapCountSetting);

        return {
            lapRange: `第${this.lapData[0].lap}圈 - 第${this.lapData[this.lapData.length - 1].lap}圈`,
            totalTime: `${totalTime.toFixed(3)}s`,
            averageTime: `${averageTime.toFixed(3)}s`,
            averageSpeed: `${averageSpeed.toFixed(2)} m/s`,
            maxSpeed: `${maxSpeed.toFixed(2)} m/s`,
            fastestLap: `${minTime.toFixed(3)}s (第${this.lapData.find(lap => lap.time === minTime).lap}圈)`,
            slowestLap: `${maxTime.toFixed(3)}s (第${this.lapData.find(lap => lap.time === maxTime).lap}圈)`,
            timeDifference: `${(maxTime - minTime).toFixed(3)}s`,
            fastestCombo: `${fastestCombo.total.toFixed(3)}s`,
            fastestComboRange: fastestCombo.range
        };
    }

    // 查找最快的连续N圈组合
    findFastestContinuousLaps(n) {
        if (this.lapData.length < n) {
            return { total: 0, range: '数据不足', startLap: 0, endLap: 0 };
        }

        let minTotal = Number.MAX_VALUE;
        let bestStartIndex = 0;

        for (let i = 0; i <= this.lapData.length - n; i++) {
            const total = this.lapData.slice(i, i + n).reduce((sum, lap) => sum + lap.time, 0);
            if (total < minTotal) {
                minTotal = total;
                bestStartIndex = i;
            }
        }

        const startLap = this.lapData[bestStartIndex].lap;
        const endLap = this.lapData[bestStartIndex + n - 1].lap;

        return {
            total: minTotal,
            range: `第${startLap}-${endLap}圈`,
            startLap: startLap,
            endLap: endLap
        };
    }

    // 更新智能统计显示
    updateIntelligentStats() {
        this.addDebugLog(`更新智能统计 - 数据量: ${this.lapData.length}`);

        if (this.lapData.length === 0) {
            this.addDebugLog('显示空数据状态');
            // 显示空数据状态
            this.elements.fastestComboTime.textContent = '-';
            this.elements.fastestComboRange.textContent = '暂无数据';
            this.elements.overallAverage.textContent = '-';
            this.elements.overallAverageSpeed.textContent = '平均速度: - m/s';
            this.elements.fastestSingleLap.textContent = '-';
            this.elements.fastestSingleLapNumber.textContent = '暂无数据';
            this.elements.slowestSingleLap.textContent = '-';
            this.elements.slowestSingleLapNumber.textContent = '暂无数据';
            this.elements.timeDifference.textContent = '-';
            this.elements.fastestSpeed.textContent = '-';
            this.elements.fastestSpeedLap.textContent = '暂无数据';

            // 清空相对分析表格
            this.elements.relativeAnalysisTableBody.innerHTML = '<tr><td colspan="5">暂无数据</td></tr>';
            return;
        }

        this.addDebugLog('计算统计数据...');
        const times = this.lapData.map(lap => lap.time);
        const speeds = this.lapData.map(lap => lap.speed);

        // 基本统计
        const totalTime = times.reduce((sum, time) => sum + time, 0);
        const averageTime = totalTime / times.length;
        const averageSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;

        // 最值
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const maxSpeed = Math.max(...speeds);

        const fastestLapData = this.lapData.find(lap => lap.time === minTime);
        const slowestLapData = this.lapData.find(lap => lap.time === maxTime);
        const fastestSpeedData = this.lapData.find(lap => lap.speed === maxSpeed);

        // 最快连续组合
        const fastestCombo = this.findFastestContinuousLaps(this.lapCountSetting);

        this.addDebugLog('更新显示元素...');
        // 更新显示
        this.elements.fastestComboTime.textContent = `${fastestCombo.total.toFixed(3)} s`;
        this.elements.fastestComboRange.textContent = fastestCombo.range;
        this.elements.overallAverage.textContent = `${averageTime.toFixed(3)} s`;
        this.elements.overallAverageSpeed.textContent = `平均速度: ${averageSpeed.toFixed(2)} m/s`;
        this.elements.fastestSingleLap.textContent = `${minTime.toFixed(3)} s`;
        this.elements.fastestSingleLapNumber.textContent = `第${fastestLapData.lap}圈`;
        this.elements.slowestSingleLap.textContent = `${maxTime.toFixed(3)} s`;
        this.elements.slowestSingleLapNumber.textContent = `第${slowestLapData.lap}圈`;
        this.elements.timeDifference.textContent = `${(maxTime - minTime).toFixed(3)} s`;
        this.elements.fastestSpeed.textContent = `${maxSpeed.toFixed(2)} m/s`;
        this.elements.fastestSpeedLap.textContent = `第${fastestSpeedData.lap}圈`;

        // 更新相对分析表格
        this.updateRelativeAnalysisTable();
        this.addDebugLog('智能统计更新完成');
    }

    // 更新相对分析表格
    updateRelativeAnalysisTable() {
        const tableBody = this.elements.relativeAnalysisTableBody;

        if (this.lapData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #78909c;">暂无数据</td></tr>';
            return;
        }

        const times = this.lapData.map(lap => lap.time);
        const fastestTime = Math.min(...times);

        tableBody.innerHTML = '';

        this.lapData.forEach(lap => {
            const timeDiff = lap.time - fastestTime;
            const percentDiff = ((lap.time - fastestTime) / fastestTime * 100);
            const isFastest = lap.time === fastestTime;

            const row = document.createElement('tr');
            if (isFastest) {
                row.className = 'fastest-lap';
            }

            row.innerHTML = `
                <td>第${lap.lap}圈</td>
                <td>${lap.time.toFixed(3)}</td>
                <td>${lap.speed.toFixed(2)}</td>
                <td>${isFastest ? '0.000' : '+' + timeDiff.toFixed(3)}</td>
                <td>${isFastest ? '0.0%' : '+' + percentDiff.toFixed(1) + '%'}</td>
            `;

            tableBody.appendChild(row);
        });
    }

    connect() {
        this.updateConnectionStatus('connecting');
        this.addDebugLog('正在连接WebSocket服务器...');

        try {
            const wsUrl = `ws://${window.location.host}/ws`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.isConnected = true;
                this.updateConnectionStatus('connected');
                this.addDebugLog('WebSocket连接成功');

                // 连接成功后，只在初始连接时重置数据
                setTimeout(() => {
                    if (!this.hasInitialReset) {
                        this.performAutoReset();
                        this.hasInitialReset = true;
                    }
                    this.requestCurrentStats();
                }, 500);

                // 不再自动启动监测，等待用户手动启动
                this.addDebugLog('系统就绪，请手动点击"启动检测"开始监测');
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
                this.addDebugLog('WebSocket连接已关闭，3秒后重连...');

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
        this.updateMonitoringButtons();
        this.addDebugLog('开始数据监测');

        // 发送开始监测指令给后端
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'start_monitoring',
                timestamp: Date.now()
            }));
        }
    }

    stopMonitoring() {
        this.isMonitoring = false;
        this.updateMonitoringButtons();
        this.addDebugLog('停止数据监测');

        // 发送停止监测指令给后端
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'stop_monitoring',
                timestamp: Date.now()
            }));
        }
    }

    updateConnectionStatus(status) {
        const statusElement = this.elements.status;

        statusElement.className = `status ${status}`;

        switch (status) {
            case 'connected':
                statusElement.textContent = 'WebSocket状态: 已连接';
                break;
            case 'connecting':
                statusElement.textContent = 'WebSocket状态: 连接中...';
                break;
            case 'disconnected':
                statusElement.textContent = 'WebSocket状态: 未连接';
                break;
        }

        this.updateMonitoringButtons();
    }

    updateMonitoringButtons() {
        const startBtn = this.elements.startButton;
        const stopBtn = this.elements.stopButton;

        if (this.isConnected) {
            if (this.isMonitoring) {
                startBtn.disabled = true;
                stopBtn.disabled = false;
                startBtn.textContent = '🔄 监测中...';
                stopBtn.textContent = '⏸️ 停止检测';
            } else {
                startBtn.disabled = false;
                stopBtn.disabled = true;
                startBtn.textContent = '▶️ 启动检测';
                stopBtn.textContent = '⏸️ 停止检测';
            }
        } else {
            startBtn.disabled = true;
            stopBtn.disabled = true;
            startBtn.textContent = '📡 重连中...';
        }
    }

    handleMessage(data) {
        this.addDebugLog(`收到消息: ${data.type}`);

        switch (data.type) {
            case 'init':
                this.addDebugLog(data.message);
                break;

            case 'lap_data':
                if (this.isMonitoring) {
                    this.handleLapData(data);
                }
                break;

            case 'reset_confirm':
                this.addDebugLog(data.message);
                break;

            case 'monitoring_started':
                this.addDebugLog('后端确认：开始监测');
                break;

            case 'monitoring_stopped':
                this.addDebugLog('后端确认：停止监测');
                break;

            case 'lap_count_updated':
                this.addDebugLog(`圈数设置已更新为: ${data.lap_count}`);
                this.requestCurrentStats();
                break;

            case 'current_stats':
                if (data.laps_stats) {
                    this.updateStatsDisplay(data.laps_stats);
                    this.addDebugLog('统计数据已刷新');
                } else {
                    this.addDebugLog('暂无统计数据');
                }

                // 更新基本数据显示
                if (typeof data.current_lap !== 'undefined') {
                    this.elements.currentLap.textContent = data.current_lap;
                }
                if (typeof data.total_time !== 'undefined') {
                    this.elements.totalTime.textContent = `${data.total_time.toFixed(3)} s`;
                }
                break;

            case 'error':
                this.addDebugLog(`错误: ${data.message}`, 'error');
                break;

            default:
                this.addDebugLog(`未知消息类型: ${data.type}`, 'error');
        }
    }

    handleLapData(data) {
        this.addDebugLog(`第${data.lap_number}圈: ${data.lap_time}s, 速度: ${data.speed}m/s`);

        // 更新基本统计
        this.elements.currentLap.textContent = data.lap_number;
        this.elements.totalTime.textContent = `${data.total_time} s`;

        // 添加到数据数组，包含速度信息
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

        // 更新显示
        this.updateLapDetails();
        this.updateChart();
        this.updateIntelligentStats();

        // 更新统计信息
        if (data.laps_stats) {
            this.updateStatsDisplay(data.laps_stats);
        }
    }

    updateLapDetails() {
        const lapDetails = this.elements.lapDetails;

        if (this.lapData.length === 0) {
            lapDetails.innerHTML = '<div class="lap-item">暂无圈速数据</div>';
            return;
        }

        // 显示最近的圈数（倒序），最多显示1000条
        const displayCount = Math.min(this.lapData.length, this.maxLapDisplayCount);
        const recentLaps = this.lapData.slice(-displayCount);

        lapDetails.innerHTML = recentLaps.map(lap =>
            `<div class="lap-item">第${lap.lap}圈: ${lap.time}s | ${lap.speed}m/s</div>`
        ).join('');

        // 如果有数据被截断，显示提示
        if (this.lapData.length > this.maxLapDisplayCount) {
            lapDetails.innerHTML = `
                <div style="background: linear-gradient(135deg, #ff7043 0%, #ff5722 100%); color: white; padding: 8px 12px; margin: 3px 0; border-radius: 8px; text-align: center; font-weight: 600;">
                    显示最近${this.maxLapDisplayCount}圈数据 (共${this.lapData.length}圈)
                </div>
            ` + lapDetails.innerHTML;
        }
    }

    updateStatsDisplay(lapsStats) {
        if (!lapsStats) return;

        // 显示统计部分
        this.elements.statsSection.style.display = 'block';

        // 更新圈数显示
        const lapCount = lapsStats.setting ? lapsStats.setting.lap_count : this.lapCountSetting;
        this.elements.recentLapsDisplayCount.textContent = lapCount;
        this.elements.recentLapsCount.textContent = lapCount;
        this.elements.bestLapsCount.textContent = lapCount;

        // 更新最近圈速
        if (lapsStats.recent_laps) {
            this.elements.recentLapsTotal.textContent = `${lapsStats.recent_laps.total} s`;
            this.updateRecentLapsDetails(lapsStats.recent_laps, lapCount);
        }

        // 更新最佳圈速
        if (lapsStats.best_laps) {
            this.elements.bestLapsTime.textContent = `${lapsStats.best_laps.total} s`;
        }
    }

    updateRecentLapsDetails(recentLaps, lapCount) {
        const recentLapsDetails = this.elements.recentLapsDetails;

        if (!recentLaps.laps || recentLaps.total === 0 || this.lapData.length === 0) {
            recentLapsDetails.innerHTML = '<div class="recent-lap-item">暂无数据</div>';
            return;
        }

        // 解析圈数范围
        let startLap = 1, endLap = 1;
        if (recentLaps.laps.includes('-')) {
            const rangeMatch = recentLaps.laps.match(/第(\d+)-(\d+)圈/);
            if (rangeMatch) {
                startLap = parseInt(rangeMatch[1]);
                endLap = parseInt(rangeMatch[2]);
            }
        } else {
            const singleMatch = recentLaps.laps.match(/第(\d+)圈/);
            if (singleMatch) {
                startLap = endLap = parseInt(singleMatch[1]);
            }
        }

        // 计算平均速度
        const recentLapsData = [];
        for (let lapNum = startLap; lapNum <= endLap; lapNum++) {
            const lapInfo = this.lapData.find(lap => lap.lap === lapNum);
            if (lapInfo) {
                recentLapsData.push(lapInfo);
            }
        }

        const averageTime = recentLaps.total / lapCount;
        const averageSpeed = recentLapsData.length > 0 ?
            recentLapsData.reduce((sum, lap) => sum + lap.speed, 0) / recentLapsData.length : 0;

        // 构建详细信息HTML
        let detailsHTML = '';

        // 添加统计信息
        detailsHTML += `
            <div class="recent-lap-item" style="background: linear-gradient(135deg, #81c784 0%, #66bb6a 100%); color: white; font-weight: 600;">
                圈数范围: ${recentLaps.laps}
            </div>
            <div class="recent-lap-item" style="background: linear-gradient(135deg, #4db6ac 0%, #26a69a 100%); color: white; font-weight: 600;">
                总时间: ${recentLaps.total}s | 平均: ${averageTime.toFixed(3)}s
            </div>
            <div class="recent-lap-item recent-lap-best">
                平均速度: ${averageSpeed.toFixed(2)}m/s
            </div>
            <div style="height: 1px; background: #e0f2f1; margin: 8px 0;"></div>
        `;

        // 添加每圈详细时间和速度
        for (let lapNum = startLap; lapNum <= endLap; lapNum++) {
            const lapInfo = this.lapData.find(lap => lap.lap === lapNum);
            if (lapInfo) {
                // 判断是否是最快的一圈
                const recentLapTimes = [];
                for (let i = startLap; i <= endLap; i++) {
                    const lap = this.lapData.find(l => l.lap === i);
                    if (lap) recentLapTimes.push(lap.time);
                }
                const isFastest = recentLapTimes.length > 1 && lapInfo.time === Math.min(...recentLapTimes);

                detailsHTML += `
                    <div class="recent-lap-item ${isFastest ? 'recent-lap-best' : ''}"
                         style="${isFastest ? '' : 'background: #f1f8e9; border-left: 4px solid #81c784;'}">
                        第${lapNum}圈: ${lapInfo.time}s | ${lapInfo.speed}m/s ${isFastest ? '🏆' : ''}
                    </div>
                `;
            }
        }

        recentLapsDetails.innerHTML = detailsHTML;
    }

    updateChart() {
        const labels = this.lapData.map(d => `第${d.lap}圈`);
        const speeds = this.lapData.map(d => d.speed);

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = speeds;
        this.chart.update('none');
    }

    openSettings() {
        this.elements.settingsModal.style.display = 'block';
        this.elements.settingLapNumber.value = this.lapCountSetting;
        this.elements.settingShowDebug.checked = this.showDebug;

        this.addDebugLog(`打开设置`);
    }

    closeSettings() {
        this.elements.settingsModal.style.display = 'none';
    }

    updateLapCountSetting() {
        const newCount = parseInt(this.elements.settingLapNumber.value);

        if (isNaN(newCount) || newCount < 1 || newCount > 100) {
            this.addDebugLog('无效的圈数设置', 'error');
            this.elements.settingLapNumber.value = this.lapCountSetting;
            return;
        }

        this.lapCountSetting = newCount;

        // 发送更新指令给后端
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'update_lap_count',
                lap_count: newCount,
                timestamp: Date.now()
            }));
            this.addDebugLog(`更新统计圈数为: ${newCount}`);
        }

        // 立即更新智能统计
        this.updateIntelligentStats();
    }

    toggleDebugDisplay() {
        this.showDebug = this.elements.settingShowDebug.checked;
        this.elements.debugInfo.style.display = this.showDebug ? 'flex' : 'none';
        this.addDebugLog(`调试信息显示: ${this.showDebug ? '开启' : '关闭'}`);
    }

    resetData() {
        if (confirm('确定要手动重置所有数据吗？')) {
            // 发送重置指令给后端
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'reset_data',
                    timestamp: Date.now(),
                    reason: 'manual_reset'
                }));
            }

            // 重置前端数据
            this.resetFrontendData();
            this.addDebugLog('手动重置数据完成');
        }
    }

    requestCurrentStats() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'request_current_stats',
                timestamp: Date.now()
            }));
            this.addDebugLog('请求当前统计数据');
        } else {
            this.addDebugLog('WebSocket未连接，无法请求数据', 'error');
        }
    }

    addDebugLog(message, type = 'info') {
        if (!this.showDebug) return;

        const debugContent = this.elements.debugContent;
        const time = new Date().toLocaleTimeString();

        const entry = document.createElement('div');
        entry.style.color = type === 'error' ? '#f44336' : '#37474f';
        entry.innerHTML = `[${time}] ${message}`;

        debugContent.appendChild(entry);

        // 限制日志条数
        const entries = debugContent.children;
        if (entries.length > 100) {
            debugContent.removeChild(entries[0]);
        }

        // 滚动到底部
        debugContent.scrollTop = debugContent.scrollHeight;

        // 同时输出到控制台
        console.log(`[Speed Monitor] ${message}`);
    }

    // 页面加载时自动重置数据
    autoResetOnPageLoad() {
        this.addDebugLog('页面加载时自动重置数据');
        this.performAutoReset();
        this.hasInitialReset = true;
        this.addDebugLog('数据已重置，系统就绪');
    }

    // 页面卸载时自动重置数据
    autoResetOnPageUnload() {
        this.addDebugLog('页面卸载时自动重置数据');
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'reset_data',
                timestamp: Date.now(),
                reason: 'page_unload'
            }));
        }

        // 关闭WebSocket连接
        if (this.ws) {
            this.ws.close();
        }
    }

    // 执行自动重置
    performAutoReset() {
        // 发送重置指令给后端
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'reset_data',
                timestamp: Date.now(),
                reason: 'auto_reset'
            }));
            this.addDebugLog('已发送自动重置指令给后端');
        }

        // 重置前端数据
        this.resetFrontendData();
    }

    // 重置前端数据（不需要确认）
    resetFrontendData() {
        this.lapData = [];

        // 重置显示
        this.elements.currentLap.textContent = '0';
        this.elements.totalTime.textContent = '0.000 s';
        this.elements.lapDetails.innerHTML = '<div class="lap-item">暂无圈速数据</div>';
        this.elements.recentLapsDetails.innerHTML = '<div class="recent-lap-item">暂无数据</div>';
        this.elements.statsSection.style.display = 'none';

        // 清空图表，保持示例数据结构
        this.chart.data.labels = [];
        this.chart.data.datasets[0].data = [];
        this.chart.update();

        // 重置智能统计
        this.updateIntelligentStats();

        this.addDebugLog('前端数据已重置，等待新数据');
    }
}

// 当页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.speedMonitorApp = new SpeedMonitorApp();
});
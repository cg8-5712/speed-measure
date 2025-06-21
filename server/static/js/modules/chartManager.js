/**
 * 图表管理器
 * 负责Chart.js图表的创建、更新和管理
 */
export class ChartManager {
    constructor(debugManager) {
        this.debugManager = debugManager;
        this.chart = null;
        this.maxDataPoints = 20; // 最大显示数据点数
        this.chartInitialized = false;
    }

    /**
     * 初始化图表
     */
    initialize() {
        try {
            this.createChart();
            this.chartInitialized = true;
            this.debugManager.addDebugInfo('📊 图表管理器已初始化');
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 图表初始化失败: ${error.message}`);
        }
    }

    /**
     * 创建Chart.js图表
     */
    createChart() {
        const ctx = document.getElementById('velocityChart');
        if (!ctx) {
            throw new Error('找不到图表容器元素');
        }

        this.chart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '🚀 V2 速度',
                    data: [],
                    borderColor: '#4fc3f7',
                    backgroundColor: 'rgba(79, 195, 247, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#4fc3f7',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: this.getChartOptions()
        });

        this.debugManager.addDebugInfo('📊 Chart.js图表已创建');
    }

    /**
     * 获取图表配置选项
     */
    getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        font: {
                            size: 14,
                            weight: '600'
                        },
                        color: '#37474f',
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(55, 71, 79, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#4fc3f7',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        title: function(context) {
                            return '时间: ' + context[0].label;
                        },
                        label: function(context) {
                            return 'V2 速度: ' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '速度 (V2)',
                        font: {
                            size: 14,
                            weight: '600'
                        },
                        color: '#37474f'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)',
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#37474f',
                        font: {
                            size: 12
                        },
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '时间',
                        font: {
                            size: 14,
                            weight: '600'
                        },
                        color: '#37474f'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)',
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#37474f',
                        font: {
                            size: 10
                        },
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            },
            animation: {
                duration: 200,
                easing: 'easeInOutQuart'
            }
        };
    }

    /**
     * 更新图表数据
     */
    updateChart(data) {
        if (!this.chart || !this.chartInitialized) {
            this.debugManager.addDebugInfo('⚠️ 图表未初始化，跳过更新');
            return;
        }

        if (!data.velocity) {
            this.debugManager.addDebugInfo('⚠️ 没有速度数据，跳过图表更新');
            return;
        }

        try {
            const velocityData = data.velocity;

            // 添加新数据点
            this.chart.data.labels.push(velocityData.time);
            this.chart.data.datasets[0].data.push(velocityData.v2);

            // 限制数据点数量
            if (this.chart.data.labels.length > this.maxDataPoints) {
                this.chart.data.labels.shift();
                this.chart.data.datasets[0].data.shift();
            }

            // 更新图表
            this.chart.update('none');

            this.debugManager.addDebugInfo(
                `📊 图表已更新，数据点数量: ${this.chart.data.labels.length}, V2: ${velocityData.v2.toFixed(2)}`
            );
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 图表更新失败: ${error.message}`);
        }
    }

    /**
     * 清空图表数据
     */
    clearChart() {
        if (!this.chart) {
            return;
        }

        try {
            this.chart.data.labels = [];
            this.chart.data.datasets[0].data = [];
            this.chart.update();
            this.debugManager.addDebugInfo('🧹 图表数据已清空');
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 清空图表失败: ${error.message}`);
        }
    }

    /**
     * 设置最大数据点数
     */
    setMaxDataPoints(max) {
        this.maxDataPoints = Math.max(5, Math.min(100, max)); // 限制在5-100之间
        this.debugManager.addDebugInfo(`📊 最大数据点数已设置为: ${this.maxDataPoints}`);
    }

    /**
     * 更新图表主题
     */
    updateTheme(theme = 'light') {
        if (!this.chart) {
            return;
        }

        const themes = {
            light: {
                backgroundColor: 'rgba(79, 195, 247, 0.1)',
                borderColor: '#4fc3f7',
                pointBackgroundColor: '#4fc3f7',
                textColor: '#37474f',
                gridColor: 'rgba(0,0,0,0.1)'
            },
            dark: {
                backgroundColor: 'rgba(79, 195, 247, 0.2)',
                borderColor: '#64b5f6',
                pointBackgroundColor: '#64b5f6',
                textColor: '#ffffff',
                gridColor: 'rgba(255,255,255,0.1)'
            }
        };

        const selectedTheme = themes[theme] || themes.light;

        try {
            // 更新数据集样式
            this.chart.data.datasets[0].backgroundColor = selectedTheme.backgroundColor;
            this.chart.data.datasets[0].borderColor = selectedTheme.borderColor;
            this.chart.data.datasets[0].pointBackgroundColor = selectedTheme.pointBackgroundColor;

            // 更新选项
            this.chart.options.plugins.legend.labels.color = selectedTheme.textColor;
            this.chart.options.scales.x.title.color = selectedTheme.textColor;
            this.chart.options.scales.y.title.color = selectedTheme.textColor;
            this.chart.options.scales.x.ticks.color = selectedTheme.textColor;
            this.chart.options.scales.y.ticks.color = selectedTheme.textColor;
            this.chart.options.scales.x.grid.color = selectedTheme.gridColor;
            this.chart.options.scales.y.grid.color = selectedTheme.gridColor;

            this.chart.update();
            this.debugManager.addDebugInfo(`🎨 图表主题已更新为: ${theme}`);
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 更新图表主题失败: ${error.message}`);
        }
    }

    /**
     * 导出图表为图片
     */
    exportChart(filename = null) {
        if (!this.chart) {
            this.debugManager.addDebugInfo('❌ 图表未初始化，无法导出');
            return null;
        }

        try {
            const canvas = this.chart.canvas;
            const url = canvas.toDataURL('image/png');

            if (filename) {
                const link = document.createElement('a');
                link.download = filename;
                link.href = url;
                link.click();
                this.debugManager.addDebugInfo(`📤 图表已导出为: ${filename}`);
            }

            return url;
        } catch (error) {
            this.debugManager.addDebugInfo(`❌ 导出图表失败: ${error.message}`);
            return null;
        }
    }

    /**
     * 调整图表大小
     */
    resize() {
        if (this.chart) {
            try {
                this.chart.resize();
                this.debugManager.addDebugInfo('📊 图表大小已调整');
            } catch (error) {
                this.debugManager.addDebugInfo(`❌ 调整图表大小失败: ${error.message}`);
            }
        }
    }

    /**
     * 获取图表统计信息
     */
    getChartStats() {
        if (!this.chart) {
            return null;
        }

        const data = this.chart.data.datasets[0].data;
        if (data.length === 0) {
            return null;
        }

        const values = [...data];
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

        return {
            dataPoints: values.length,
            minValue: min,
            maxValue: max,
            avgValue: avg,
            latestValue: values[values.length - 1],
            range: max - min
        };
    }

    /**
     * 设置图表动画
     */
    setAnimation(enabled = true, duration = 200) {
        if (this.chart) {
            this.chart.options.animation.duration = enabled ? duration : 0;
            this.debugManager.addDebugInfo(`🎬 图表动画${enabled ? '已启用' : '已禁用'}`);
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        if (this.chart) {
            try {
                this.chart.destroy();
                this.chart = null;
                this.chartInitialized = false;
                this.debugManager.addDebugInfo('🧹 图表资源已清理');
            } catch (error) {
                this.debugManager.addDebugInfo(`❌ 清理图表资源失败: ${error.message}`);
            }
        }
    }

    /**
     * 重新初始化图表
     */
    reinitialize() {
        this.cleanup();
        this.initialize();
    }
}
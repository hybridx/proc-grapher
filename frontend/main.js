import {
    Chart,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    TimeScale
);

class ProcGrapher {
    constructor() {
        this.baseUrl = '';
        this.isConnected = false;
        this.isLinux = false;
        this.charts = {};
        this.currentHours = 1;
        this.updateInterval = null;
        this.connectionTimeout = 10000; // 10 seconds
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadStoredConnection();
    }

    setupEventListeners() {
        // Connection form
        const connectBtn = document.getElementById('connect-btn');
        const hostInput = document.getElementById('backend-host');
        const portInput = document.getElementById('backend-port');

        connectBtn.addEventListener('click', () => {
            const host = hostInput.value.trim() || 'localhost';
            const port = parseInt(portInput.value) || 8000;
            this.connect(host, port);
        });

        // Enter key on inputs
        [hostInput, portInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    connectBtn.click();
                }
            });
        });

        // Time range buttons
        const timeButtons = document.querySelectorAll('.btn[data-hours]');
        timeButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                if (!this.isConnected) return;
                
                timeButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                
                this.currentHours = parseInt(e.target.dataset.hours);
                await this.loadHistoricalData();
            });
        });
    }

    loadStoredConnection() {
        const storedHost = localStorage.getItem('procgrapher_host');
        const storedPort = localStorage.getItem('procgrapher_port');
        
        if (storedHost) {
            document.getElementById('backend-host').value = storedHost;
        }
        if (storedPort) {
            document.getElementById('backend-port').value = storedPort;
        }
    }

    storeConnection(host, port) {
        localStorage.setItem('procgrapher_host', host);
        localStorage.setItem('procgrapher_port', port);
    }

    async connect(host, port) {
        const connectBtn = document.getElementById('connect-btn');
        const statusIndicator = document.getElementById('status-indicator');
        const connectionText = document.getElementById('connection-text');
        
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting...';
        connectionText.textContent = 'Connecting...';
        
        this.baseUrl = `http://${host}:${port}`;
        
        try {
            // Test connection with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.connectionTimeout);
            
            const response = await fetch(`${this.baseUrl}/`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Successfully connected
            this.isConnected = true;
            statusIndicator.classList.add('connected');
            connectionText.textContent = `Connected to ${host}:${port}`;
            connectBtn.textContent = 'Disconnect';
            connectBtn.disabled = false;
            
            this.storeConnection(host, port);
            
            // Load system info and start monitoring
            await this.loadSystemInfo();
            await this.loadCurrentMetrics();
            await this.loadHistoricalData();
            await this.loadProcData();
            
            this.showConnectedSections();
            this.startRealTimeUpdates();
            
            // Update connect button to disconnect function
            connectBtn.onclick = () => this.disconnect();
            
        } catch (error) {
            console.error('Connection failed:', error);
            this.handleConnectionError(error);
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect';
            connectionText.textContent = 'Connection failed';
        }
    }

    disconnect() {
        this.isConnected = false;
        this.stopRealTimeUpdates();
        
        const statusIndicator = document.getElementById('status-indicator');
        const connectionText = document.getElementById('connection-text');
        const connectBtn = document.getElementById('connect-btn');
        
        statusIndicator.classList.remove('connected');
        connectionText.textContent = 'Disconnected';
        connectBtn.textContent = 'Connect';
        connectBtn.onclick = () => {
            const host = document.getElementById('backend-host').value.trim() || 'localhost';
            const port = parseInt(document.getElementById('backend-port').value) || 8000;
            this.connect(host, port);
        };
        
        this.hideConnectedSections();
        this.destroyCharts();
    }

    handleConnectionError(error) {
        let message = 'Connection failed';
        if (error.name === 'AbortError') {
            message = 'Connection timeout';
        } else if (error.message.includes('fetch')) {
            message = 'Network error';
        }
        
        document.getElementById('connection-text').textContent = message;
    }

    showConnectedSections() {
        document.getElementById('systemInfo').style.display = 'block';
        document.getElementById('metricsGrid').style.display = 'grid';
        document.getElementById('chartControls').style.display = 'flex';
        document.getElementById('chartsContainer').style.display = 'grid';
        
        if (this.isLinux) {
            document.querySelectorAll('.linux-only').forEach(el => {
                el.classList.add('show');
            });
        }
    }

    hideConnectedSections() {
        document.getElementById('systemInfo').style.display = 'none';
        document.getElementById('metricsGrid').style.display = 'none';
        document.getElementById('chartControls').style.display = 'none';
        document.getElementById('chartsContainer').style.display = 'none';
        
        document.querySelectorAll('.linux-only').forEach(el => {
            el.classList.remove('show');
        });
    }

    async apiCall(endpoint) {
        if (!this.isConnected) {
            throw new Error('Not connected');
        }
        
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
    }

    async loadSystemInfo() {
        try {
            const systemInfo = await this.apiCall('/api/system/info');
            this.isLinux = systemInfo.is_linux;
            this.renderSystemInfo(systemInfo);
        } catch (error) {
            console.error('Error loading system info:', error);
            document.getElementById('systemInfoGrid').innerHTML = 
                '<div class="error">Failed to load system information</div>';
        }
    }

    renderSystemInfo(info) {
        const grid = document.getElementById('systemInfoGrid');
        
        const formatUptime = (seconds) => {
            if (!seconds) return 'Unknown';
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${days}d ${hours}h ${minutes}m`;
        };
        
        let uptimeDisplay = '';
        if (info.uptime_seconds) {
            uptimeDisplay = `
                <div class="info-item">
                    <div class="info-label">Uptime</div>
                    <div class="info-value">${formatUptime(info.uptime_seconds)}</div>
                </div>
            `;
        }
        
        grid.innerHTML = `
            <div class="info-item">
                <div class="info-label">System</div>
                <div class="info-value">${info.system} ${this.isLinux ? '🐧' : ''}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Node</div>
                <div class="info-value">${info.node}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Release</div>
                <div class="info-value">${info.release}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Architecture</div>
                <div class="info-value">${info.machine}</div>
            </div>
            <div class="info-item">
                <div class="info-label">CPU Cores</div>
                <div class="info-value">${info.cpu_count} (${info.cpu_count_logical} logical)</div>
            </div>
            <div class="info-item">
                <div class="info-label">Boot Time</div>
                <div class="info-value">${new Date(info.boot_time).toLocaleString()}</div>
            </div>
            ${uptimeDisplay}
        `;
    }

    async loadCurrentMetrics() {
        try {
            const metrics = await this.apiCall('/api/metrics/current');
            this.renderCurrentMetrics(metrics);
        } catch (error) {
            console.error('Error loading current metrics:', error);
            document.getElementById('metricsGrid').innerHTML = 
                '<div class="error">Failed to load current metrics</div>';
        }
    }

    renderCurrentMetrics(metrics) {
        const grid = document.getElementById('metricsGrid');
        
        const formatBytes = (bytes) => {
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            if (bytes === 0) return '0 Bytes';
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        };

        let loadAvgCard = '';
        if (this.isLinux && metrics.load_avg_1m !== null) {
            loadAvgCard = `
                <div class="metric-card">
                    <h3>Load Average</h3>
                    <div class="metric-value">${metrics.load_avg_1m?.toFixed(2) || 'N/A'}</div>
                    <div class="metric-detail">
                        1m: ${metrics.load_avg_1m?.toFixed(2) || 'N/A'} | 
                        5m: ${metrics.load_avg_5m?.toFixed(2) || 'N/A'} | 
                        15m: ${metrics.load_avg_15m?.toFixed(2) || 'N/A'}
                    </div>
                </div>
            `;
        }

        let processCard = '';
        if (this.isLinux && metrics.processes_running !== null) {
            processCard = `
                <div class="metric-card">
                    <h3>Processes</h3>
                    <div class="metric-value">${metrics.processes_running || 0}</div>
                    <div class="metric-detail">
                        Running: ${metrics.processes_running || 0} | 
                        Total: ${metrics.processes_total || 0}
                    </div>
                </div>
            `;
        }

        grid.innerHTML = `
            <div class="metric-card">
                <h3>CPU Usage</h3>
                <div class="metric-value">${metrics.cpu_percent.toFixed(1)}%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${metrics.cpu_percent}%; background: ${this.getColorForPercentage(metrics.cpu_percent)}"></div>
                </div>
            </div>
            <div class="metric-card">
                <h3>Memory Usage</h3>
                <div class="metric-value">${metrics.memory_percent.toFixed(1)}%</div>
                <div class="metric-detail">
                    ${formatBytes(metrics.memory_used)} / ${formatBytes(metrics.memory_total)}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${metrics.memory_percent}%; background: ${this.getColorForPercentage(metrics.memory_percent)}"></div>
                </div>
            </div>
            <div class="metric-card">
                <h3>Disk Usage</h3>
                <div class="metric-value">${metrics.disk_percent.toFixed(1)}%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${metrics.disk_percent}%; background: ${this.getColorForPercentage(metrics.disk_percent)}"></div>
                </div>
            </div>
            <div class="metric-card">
                <h3>Network I/O</h3>
                <div class="metric-detail">
                    <div>📤 ${formatBytes(metrics.network_sent)}</div>
                    <div>📥 ${formatBytes(metrics.network_recv)}</div>
                </div>
            </div>
            ${loadAvgCard}
            ${processCard}
        `;
    }

    getColorForPercentage(percentage) {
        if (percentage < 50) return '#48bb78';
        if (percentage < 80) return '#ed8936';
        return '#f56565';
    }

    async loadHistoricalData() {
        try {
            const data = await this.apiCall(`/api/metrics/history?hours=${this.currentHours}`);
            this.renderOverviewChart(data.metrics);
            
            if (this.isLinux) {
                this.renderLoadChart(data.metrics);
            }
        } catch (error) {
            console.error('Error loading historical data:', error);
        }
    }

    renderOverviewChart(metrics) {
        const ctx = document.getElementById('overviewChart').getContext('2d');
        
        if (this.charts.overview) {
            this.charts.overview.destroy();
        }

        const timestamps = metrics.map(m => new Date(m.timestamp));
        
        this.charts.overview = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timestamps,
                datasets: [
                    {
                        label: 'CPU %',
                        data: metrics.map(m => m.cpu_percent),
                        borderColor: '#4299e1',
                        backgroundColor: 'rgba(66, 153, 225, 0.1)',
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Memory %',
                        data: metrics.map(m => m.memory_percent),
                        borderColor: '#48bb78',
                        backgroundColor: 'rgba(72, 187, 120, 0.1)',
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Disk %',
                        data: metrics.map(m => m.disk_percent),
                        borderColor: '#ed8936',
                        backgroundColor: 'rgba(237, 137, 54, 0.1)',
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            displayFormats: {
                                minute: 'HH:mm',
                                hour: 'HH:mm'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Percentage (%)'
                        }
                    }
                }
            }
        });
    }

    renderLoadChart(metrics) {
        if (!this.isLinux) return;
        
        const ctx = document.getElementById('loadChart').getContext('2d');
        
        if (this.charts.load) {
            this.charts.load.destroy();
        }

        const timestamps = metrics.map(m => new Date(m.timestamp));
        const validMetrics = metrics.filter(m => m.load_avg_1m !== null);
        
        if (validMetrics.length === 0) return;
        
        this.charts.load = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timestamps,
                datasets: [
                    {
                        label: '1 min',
                        data: metrics.map(m => m.load_avg_1m),
                        borderColor: '#f56565',
                        backgroundColor: 'rgba(245, 101, 101, 0.1)',
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: '5 min',
                        data: metrics.map(m => m.load_avg_5m),
                        borderColor: '#ed8936',
                        backgroundColor: 'rgba(237, 137, 54, 0.1)',
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: '15 min',
                        data: metrics.map(m => m.load_avg_15m),
                        borderColor: '#38b2ac',
                        backgroundColor: 'rgba(56, 178, 172, 0.1)',
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y?.toFixed(2) || 'N/A'}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            displayFormats: {
                                minute: 'HH:mm',
                                hour: 'HH:mm'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Load Average'
                        }
                    }
                }
            }
        });
    }

    async loadProcData() {
        if (!this.isLinux) return;
        
        try {
            const [detailed, network, disk] = await Promise.all([
                this.apiCall('/api/proc/detailed'),
                this.apiCall('/api/proc/network'),
                this.apiCall('/api/proc/disk')
            ]);
            
            this.renderProcessStats(detailed.stat);
            this.renderNetworkInterfaces(network.interfaces);
            this.renderDiskStats(disk.diskstats);
        } catch (error) {
            console.error('Error loading proc data:', error);
        }
    }

    renderProcessStats(stats) {
        const container = document.getElementById('processStats');
        
        const formatNumber = (num) => {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num?.toString() || 'N/A';
        };
        
        container.innerHTML = `
            <div class="info-item">
                <div class="info-label">Running</div>
                <div class="info-value">${stats.processes_running || 'N/A'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Total</div>
                <div class="info-value">${stats.processes_total || 'N/A'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Blocked</div>
                <div class="info-value">${stats.processes_blocked || 'N/A'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Interrupts</div>
                <div class="info-value">${formatNumber(stats.interrupts_total)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Context Switches</div>
                <div class="info-value">${formatNumber(stats.context_switches)}</div>
            </div>
        `;
    }

    renderNetworkInterfaces(interfaces) {
        const container = document.getElementById('networkInterfaces');
        
        const formatBytes = (bytes) => {
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            if (bytes === 0) return '0 B';
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        };
        
        if (!interfaces || interfaces.length === 0) {
            container.innerHTML = '<div class="loading">No network interfaces found</div>';
            return;
        }
        
        container.innerHTML = interfaces
            .filter(iface => iface.interface !== 'lo') // Filter out loopback
            .map(iface => `
                <div class="interface-card">
                    <h5>${iface.interface}</h5>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                        <div>
                            <strong>RX:</strong><br>
                            📥 ${formatBytes(iface.rx_bytes)}<br>
                            📦 ${iface.rx_packets.toLocaleString()} packets<br>
                            ❌ ${iface.rx_errors} errors
                        </div>
                        <div>
                            <strong>TX:</strong><br>
                            📤 ${formatBytes(iface.tx_bytes)}<br>
                            📦 ${iface.tx_packets.toLocaleString()} packets<br>
                            ❌ ${iface.tx_errors} errors
                        </div>
                    </div>
                </div>
            `).join('');
    }

    renderDiskStats(diskstats) {
        const container = document.getElementById('diskStats');
        
        if (!diskstats || diskstats.length === 0) {
            container.innerHTML = '<div class="loading">No disk statistics found</div>';
            return;
        }
        
        // Filter out partitions and show only main devices
        const mainDevices = diskstats.filter(disk => 
            /^(sd[a-z]|hd[a-z]|nvme\d+n\d+|vd[a-z])$/.test(disk.device)
        );
        
        container.innerHTML = mainDevices.map(disk => `
            <div class="disk-card">
                <h5>/dev/${disk.device}</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                    <div>
                        <strong>Reads:</strong><br>
                        📖 ${disk.reads_completed.toLocaleString()}<br>
                        📊 ${(disk.sectors_read * 512 / 1024 / 1024).toFixed(1)} MB<br>
                        ⏱️ ${disk.read_time_ms.toLocaleString()} ms
                    </div>
                    <div>
                        <strong>Writes:</strong><br>
                        ✏️ ${disk.writes_completed.toLocaleString()}<br>
                        📊 ${(disk.sectors_written * 512 / 1024 / 1024).toFixed(1)} MB<br>
                        ⏱️ ${disk.write_time_ms.toLocaleString()} ms
                    </div>
                </div>
            </div>
        `).join('');
    }

    startRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(async () => {
            if (!this.isConnected) return;
            
            try {
                await this.loadCurrentMetrics();
                
                // Reload charts and proc data every minute
                if (Date.now() % 60000 < 5000) {
                    await this.loadHistoricalData();
                    if (this.isLinux) {
                        await this.loadProcData();
                    }
                }
            } catch (error) {
                console.error('Error during real-time update:', error);
                // Don't disconnect on temporary errors
            }
        }, 5000);
    }

    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }

    destroy() {
        this.stopRealTimeUpdates();
        this.destroyCharts();
    }
}

// Initialize the system monitor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.procGrapher = new ProcGrapher();
});

// Clean up when page is unloaded
window.addEventListener('beforeunload', () => {
    if (window.procGrapher) {
        window.procGrapher.destroy();
    }
}); 
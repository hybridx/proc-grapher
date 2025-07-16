# 🖥️ Proc Grapher - Enhanced System Monitor

A comprehensive real-time system monitoring application with auto-detection for Linux `/proc` filesystem support. Features a configurable Python FastAPI backend and a client frontend that can connect to any backend instance via IP address.

## ✨ Enhanced Features

### 🐧 Linux-First with Cross-Platform Support
- **Auto-detection**: Automatically detects Linux systems and leverages native `/proc` filesystem
- **Comprehensive `/proc` support**: `/proc/stat`, `/proc/meminfo`, `/proc/loadavg`, `/proc/uptime`, `/proc/diskstats`, `/proc/net/dev`, `/proc/cpuinfo`
- **Cross-platform fallback**: Full functionality on non-Linux systems via psutil
- **Real-time collection**: Enhanced metrics collected every 5 seconds

### 📊 Advanced Metrics
- **Basic metrics**: CPU, memory, disk, network usage (all platforms)
- **Linux-enhanced metrics**: Load averages, process counts, context switches, interrupts, detailed network interfaces, disk I/O statistics
- **Historical data**: SQLite storage with configurable time ranges (1h, 6h, 24h)
- **Process statistics**: Running/total/blocked processes from `/proc/stat`

### 🌐 Configurable Client Architecture  
- **IP-configurable frontend**: Connect to any backend instance via host:port
- **Client-server separation**: Frontend works as a standalone client
- **Connection management**: Real-time connection status with timeout handling
- **Persistent settings**: Remembers last connected backend

### 📈 Enhanced Visualizations
- **Multiple Chart.js graphs**: Overview metrics, Linux load averages, and more
- **Real-time updates**: Live metric cards with progress indicators
- **Responsive design**: Works on desktop, tablet, and mobile
- **Linux-specific UI**: Additional sections appear automatically on Linux systems

### 🔧 Developer-Friendly
- **REST API**: Clean, documented endpoints for all metrics
- **Modern stack**: FastAPI, Chart.js 4.x, ES6 modules
- **Error handling**: Robust connection management and fallback behavior

## 🏗️ Tech Stack

### Backend
- **Python 3.8+** with Poetry for dependency management
- **FastAPI** for REST API with auto-documentation
- **SQLite** for time-series data storage  
- **psutil** for cross-platform monitoring
- **Custom `/proc` parser** for Linux-native metrics
- **uvicorn** as ASGI server

### Frontend
- **Vite** for modern development experience
- **Vanilla JavaScript** (ES6 modules) - no framework dependencies
- **Chart.js 4.x** for interactive data visualization
- **Modern CSS** with glassmorphism design
- **Responsive grid layouts**

## 📁 Project Structure

```
proc-grapher/
├── backend/
│   ├── main.py              # Enhanced FastAPI application with /proc support
│   ├── pyproject.toml       # Poetry dependencies
│   ├── start.sh             # Backend start script
│   └── system_metrics.db    # SQLite database (auto-created)
├── frontend/
│   ├── index.html           # Client UI with connection config
│   ├── main.js              # Enhanced JavaScript client
│   ├── package.json         # Chart.js 4.x dependencies
│   ├── vite.config.js       # Vite configuration
│   └── start.sh             # Frontend development server script
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Python 3.8+**
- **Node.js 16+**
- **Poetry** (for Python dependency management)
- **Linux** (recommended for full `/proc` feature support)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd proc-grapher
   ```

2. **Set up the backend:**
   ```bash
   cd backend
   chmod +x start.sh
   poetry install
   ```

3. **Set up the frontend:**
   ```bash
   cd ../frontend
   chmod +x start.sh
   npm install
   ```

### Running the Application

#### Option 1: Local Development (Recommended)

1. **Start the backend:**
   ```bash
   cd backend
   ./start.sh
   ```
   Backend will be available at: http://localhost:8000

2. **Start the frontend (in a new terminal):**
   ```bash
   cd frontend
   ./start.sh
   ```
   Frontend will be available at: http://localhost:3000

3. **Connect**: Open http://localhost:3000, enter `localhost:8000`, and click Connect

#### Option 2: Remote Monitoring

1. **Start backend on target server:**
   ```bash
   cd backend
   poetry run uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. **Access from any machine**: Open http://localhost:3000 (or deploy frontend anywhere)

3. **Connect remotely**: Enter the target server's IP and port (e.g., `192.168.1.100:8000`)

### Client Usage

1. **Enter backend details**: Host IP and port in the connection form
2. **Click Connect**: Frontend will test the connection and connect if successful  
3. **Monitor systems**: View real-time and historical metrics
4. **Linux systems**: Automatically shows additional `/proc` filesystem data
5. **Disconnect/Reconnect**: Change targets anytime

## 🔌 API Endpoints

### Core Endpoints
- `GET /` - API information and features
- `GET /api/system/info` - System information with Linux detection
- `GET /api/metrics/current` - Current system metrics (enhanced for Linux)
- `GET /api/metrics/history?hours=<N>` - Historical metrics with Linux data

### Linux-Specific Endpoints  
- `GET /api/proc/detailed` - Complete `/proc` filesystem data
- `GET /api/proc/cpuinfo` - CPU information from `/proc/cpuinfo`
- `GET /api/proc/network` - Network interfaces from `/proc/net/dev`
- `GET /api/proc/disk` - Disk statistics from `/proc/diskstats`

## 🐧 Linux `/proc` Support

When running on Linux, the system automatically provides enhanced metrics:

### `/proc/stat` - System Statistics
- CPU usage per core
- Process counts (running, total, blocked)
- Context switches and interrupts
- System boot time

### `/proc/meminfo` - Memory Details
- Detailed memory breakdown
- Available, free, cached, buffer memory
- Swap usage information

### `/proc/loadavg` - Load Averages
- 1, 5, and 15-minute load averages
- Real-time visualization in dedicated chart

### `/proc/diskstats` - Disk I/O
- Per-device read/write statistics
- Sector counts and timing information
- I/O queue depth and timing

### `/proc/net/dev` - Network Interfaces
- Per-interface RX/TX bytes and packets
- Error and drop counts
- Real-time interface monitoring

### Non-Linux Systems
- Full functionality via psutil
- Cross-platform CPU, memory, disk, network metrics
- No Linux-specific sections shown

## 📱 Screenshots & Features

The application provides:

### Connection Management
- IP address configuration form
- Real-time connection status indicator
- Persistent connection settings
- Timeout handling and error reporting

### System Overview
- Auto-detected system information
- Real-time metric cards with progress bars
- Enhanced metrics for Linux systems
- Uptime and process information

### Interactive Charts
- **Overview Chart**: CPU, Memory, Disk usage over time
- **Load Average Chart** (Linux): 1m, 5m, 15m load averages
- **Historical Data**: Configurable time ranges
- Responsive Chart.js visualizations

### Linux-Specific Sections
- **Process Statistics**: Detailed process state information
- **Network Interfaces**: Per-interface statistics with RX/TX details
- **Disk Statistics**: Per-device I/O performance data
- **System Metrics**: Context switches, interrupts, and more

## 🛠️ Development

### Backend Development
```bash
cd backend
poetry install
poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Testing on Different Platforms
- **Linux**: Full feature testing with `/proc` support
- **macOS**: Cross-platform compatibility testing
- **Docker**: Deploy backend in containers for remote monitoring

## 🏭 Production Deployment

### Backend Production
```bash
cd backend
poetry install --no-dev
poetry run uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Frontend Production
```bash
cd frontend
npm run build
# Deploy dist/ to any web server
```

### Docker Deployment
```bash
# Backend
cd backend
docker build -t proc-grapher-backend .
docker run -p 8000:8000 proc-grapher-backend

# Frontend
cd frontend  
npm run build
# Serve dist/ with nginx or any static server
```

## 🌍 Use Cases

### Local Development
- Monitor development machine performance
- Debug resource-intensive applications
- Track system health during builds

### Remote Server Monitoring
- Monitor production servers from any client
- Multi-server monitoring from single dashboard
- Lightweight agent deployment

### System Administration
- Real-time Linux system analysis
- Historical performance trending
- Network and disk I/O monitoring
- Process and load monitoring

### Education & Learning
- Learn Linux `/proc` filesystem structure
- Understand system metrics and their relationships
- Real-time visualization of system behavior

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test on both Linux and non-Linux systems
5. Submit a pull request

### Development Guidelines
- Maintain cross-platform compatibility
- Test Linux `/proc` features thoroughly  
- Follow existing code style and patterns
- Add tests for new functionality

## 📄 License

This project is open source and available under the MIT License.

---

**Built with ❤️ for system monitoring enthusiasts and Linux lovers** 🐧 
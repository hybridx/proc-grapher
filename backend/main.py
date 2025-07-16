import asyncio
import sqlite3
import platform
import subprocess
import time
import json
import os
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psutil


app = FastAPI(title="System Monitor API", version="2.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DB_PATH = Path("system_metrics.db")

class SystemMetric(BaseModel):
    timestamp: str
    cpu_percent: float
    memory_percent: float
    memory_used: int
    memory_total: int
    disk_percent: float
    network_sent: int
    network_recv: int
    load_avg_1m: Optional[float] = None
    load_avg_5m: Optional[float] = None
    load_avg_15m: Optional[float] = None
    processes_running: Optional[int] = None
    processes_total: Optional[int] = None
    uptime_seconds: Optional[float] = None


class ProcMetricsCollector:
    """Linux /proc filesystem metrics collector"""
    
    def __init__(self):
        self.is_linux = platform.system().lower() == "linux"
        self.proc_path = Path("/proc")
    
    def read_proc_file(self, filename: str) -> Optional[str]:
        """Safely read a /proc file"""
        try:
            if not self.is_linux:
                return None
            with open(self.proc_path / filename, 'r') as f:
                return f.read().strip()
        except (FileNotFoundError, PermissionError, OSError):
            return None
    
    def get_proc_stat(self) -> Dict[str, Any]:
        """Parse /proc/stat for detailed CPU and system stats"""
        if not self.is_linux:
            return {}
        
        content = self.read_proc_file("stat")
        if not content:
            return {}
        
        lines = content.split('\n')
        stats = {}
        
        # Parse CPU stats
        cpu_line = lines[0]
        if cpu_line.startswith('cpu '):
            values = list(map(int, cpu_line.split()[1:]))
            stats['cpu_total'] = {
                'user': values[0],
                'nice': values[1],
                'system': values[2],
                'idle': values[3],
                'iowait': values[4] if len(values) > 4 else 0,
                'irq': values[5] if len(values) > 5 else 0,
                'softirq': values[6] if len(values) > 6 else 0,
                'steal': values[7] if len(values) > 7 else 0,
            }
        
        # Parse individual CPU cores
        cpu_cores = []
        for line in lines[1:]:
            if line.startswith('cpu'):
                if ' ' in line:
                    values = list(map(int, line.split()[1:]))
                    cpu_cores.append({
                        'user': values[0],
                        'nice': values[1],
                        'system': values[2],
                        'idle': values[3],
                        'iowait': values[4] if len(values) > 4 else 0,
                    })
            else:
                break
        
        stats['cpu_cores'] = cpu_cores
        
        # Parse other stats
        for line in lines:
            if line.startswith('processes '):
                stats['processes_total'] = int(line.split()[1])
            elif line.startswith('procs_running '):
                stats['processes_running'] = int(line.split()[1])
            elif line.startswith('procs_blocked '):
                stats['processes_blocked'] = int(line.split()[1])
            elif line.startswith('intr '):
                stats['interrupts_total'] = int(line.split()[1])
            elif line.startswith('ctxt '):
                stats['context_switches'] = int(line.split()[1])
            elif line.startswith('btime '):
                stats['boot_time'] = int(line.split()[1])
        
        return stats
    
    def get_proc_meminfo(self) -> Dict[str, Any]:
        """Parse /proc/meminfo for detailed memory information"""
        if not self.is_linux:
            return {}
        
        content = self.read_proc_file("meminfo")
        if not content:
            return {}
        
        meminfo = {}
        for line in content.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()
                
                # Extract numeric value (remove kB, etc.)
                numeric_match = re.match(r'^(\d+)', value)
                if numeric_match:
                    # Convert kB to bytes
                    meminfo[key] = int(numeric_match.group(1)) * 1024
                else:
                    meminfo[key] = value
        
        return meminfo
    
    def get_proc_loadavg(self) -> Dict[str, float]:
        """Parse /proc/loadavg for load averages"""
        if not self.is_linux:
            return {}
        
        content = self.read_proc_file("loadavg")
        if not content:
            return {}
        
        parts = content.split()
        if len(parts) >= 3:
            return {
                'load_1m': float(parts[0]),
                'load_5m': float(parts[1]),
                'load_15m': float(parts[2])
            }
        return {}
    
    def get_proc_uptime(self) -> Dict[str, float]:
        """Parse /proc/uptime for system uptime"""
        if not self.is_linux:
            return {}
        
        content = self.read_proc_file("uptime")
        if not content:
            return {}
        
        parts = content.split()
        if len(parts) >= 2:
            return {
                'uptime_seconds': float(parts[0]),
                'idle_seconds': float(parts[1])
            }
        return {}
    
    def get_proc_diskstats(self) -> List[Dict[str, Any]]:
        """Parse /proc/diskstats for disk I/O statistics"""
        if not self.is_linux:
            return []
        
        content = self.read_proc_file("diskstats")
        if not content:
            return []
        
        diskstats = []
        for line in content.split('\n'):
            parts = line.split()
            if len(parts) >= 14:
                diskstats.append({
                    'device': parts[2],
                    'reads_completed': int(parts[3]),
                    'reads_merged': int(parts[4]),
                    'sectors_read': int(parts[5]),
                    'read_time_ms': int(parts[6]),
                    'writes_completed': int(parts[7]),
                    'writes_merged': int(parts[8]),
                    'sectors_written': int(parts[9]),
                    'write_time_ms': int(parts[10]),
                    'io_in_progress': int(parts[11]),
                    'io_time_ms': int(parts[12]),
                    'weighted_io_time_ms': int(parts[13])
                })
        
        return diskstats
    
    def get_proc_net_dev(self) -> List[Dict[str, Any]]:
        """Parse /proc/net/dev for network interface statistics"""
        if not self.is_linux:
            return []
        
        content = self.read_proc_file("net/dev")
        if not content:
            return []
        
        lines = content.split('\n')
        netdev = []
        
        for line in lines[2:]:  # Skip header lines
            if ':' in line:
                interface, stats = line.split(':', 1)
                interface = interface.strip()
                stats = stats.split()
                
                if len(stats) >= 16:
                    netdev.append({
                        'interface': interface,
                        'rx_bytes': int(stats[0]),
                        'rx_packets': int(stats[1]),
                        'rx_errors': int(stats[2]),
                        'rx_dropped': int(stats[3]),
                        'tx_bytes': int(stats[8]),
                        'tx_packets': int(stats[9]),
                        'tx_errors': int(stats[10]),
                        'tx_dropped': int(stats[11])
                    })
        
        return netdev
    
    def get_proc_cpuinfo(self) -> List[Dict[str, Any]]:
        """Parse /proc/cpuinfo for CPU information"""
        if not self.is_linux:
            return []
        
        content = self.read_proc_file("cpuinfo")
        if not content:
            return []
        
        cpus = []
        current_cpu = {}
        
        for line in content.split('\n'):
            if not line.strip():
                if current_cpu:
                    cpus.append(current_cpu)
                    current_cpu = {}
            elif ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()
                current_cpu[key] = value
        
        if current_cpu:
            cpus.append(current_cpu)
        
        return cpus


def init_db():
    """Initialize SQLite database with enhanced schema"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            cpu_percent REAL NOT NULL,
            memory_percent REAL NOT NULL,
            memory_used INTEGER NOT NULL,
            memory_total INTEGER NOT NULL,
            disk_percent REAL NOT NULL,
            network_sent INTEGER NOT NULL,
            network_recv INTEGER NOT NULL,
            load_avg_1m REAL,
            load_avg_5m REAL,
            load_avg_15m REAL,
            processes_running INTEGER,
            processes_total INTEGER,
            uptime_seconds REAL
        )
    """)
    
    conn.commit()
    conn.close()


def get_system_metrics() -> Dict[str, Any]:
    """Get comprehensive system metrics using both psutil and /proc"""
    try:
        proc_collector = ProcMetricsCollector()
        
        # Basic metrics using psutil (cross-platform)
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        network = psutil.net_io_counters()
        
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_used": memory.used,
            "memory_total": memory.total,
            "disk_percent": (disk.used / disk.total) * 100,
            "network_sent": network.bytes_sent,
            "network_recv": network.bytes_recv
        }
        
        # Enhanced Linux metrics from /proc
        if proc_collector.is_linux:
            # Load averages
            loadavg = proc_collector.get_proc_loadavg()
            metrics.update({
                "load_avg_1m": loadavg.get('load_1m'),
                "load_avg_5m": loadavg.get('load_5m'),
                "load_avg_15m": loadavg.get('load_15m')
            })
            
            # Process stats
            stat_data = proc_collector.get_proc_stat()
            metrics.update({
                "processes_running": stat_data.get('processes_running'),
                "processes_total": stat_data.get('processes_total')
            })
            
            # Uptime
            uptime = proc_collector.get_proc_uptime()
            metrics.update({
                "uptime_seconds": uptime.get('uptime_seconds')
            })
        
        return metrics
    except Exception as e:
        print(f"Error getting system metrics: {e}")
        return None


def store_metric(metric: Dict[str, Any]):
    """Store metric in SQLite database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO system_metrics 
            (timestamp, cpu_percent, memory_percent, memory_used, memory_total, 
             disk_percent, network_sent, network_recv, load_avg_1m, load_avg_5m,
             load_avg_15m, processes_running, processes_total, uptime_seconds)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            metric["timestamp"],
            metric["cpu_percent"],
            metric["memory_percent"],
            metric["memory_used"],
            metric["memory_total"],
            metric["disk_percent"],
            metric["network_sent"],
            metric["network_recv"],
            metric.get("load_avg_1m"),
            metric.get("load_avg_5m"),
            metric.get("load_avg_15m"),
            metric.get("processes_running"),
            metric.get("processes_total"),
            metric.get("uptime_seconds")
        ))
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error storing metric: {e}")


async def collect_metrics():
    """Background task to collect metrics every 5 seconds"""
    while True:
        metric = get_system_metrics()
        if metric:
            store_metric(metric)
        await asyncio.sleep(5)


@app.on_event("startup")
async def startup_event():
    """Initialize database and start background metric collection"""
    init_db()
    asyncio.create_task(collect_metrics())


@app.get("/api/metrics/current")
async def get_current_metrics():
    """Get current system metrics"""
    metric = get_system_metrics()
    if metric is None:
        raise HTTPException(status_code=500, detail="Failed to get system metrics")
    return metric


@app.get("/api/metrics/history")
async def get_metrics_history(hours: int = 1):
    """Get historical metrics for the last N hours"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Calculate timestamp for N hours ago
        cutoff_time = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        cursor.execute("""
            SELECT timestamp, cpu_percent, memory_percent, memory_used, memory_total,
                   disk_percent, network_sent, network_recv, load_avg_1m, load_avg_5m,
                   load_avg_15m, processes_running, processes_total, uptime_seconds
            FROM system_metrics
            WHERE timestamp >= ?
            ORDER BY timestamp ASC
        """, (cutoff_time,))
        
        rows = cursor.fetchall()
        conn.close()
        
        metrics = []
        for row in rows:
            metrics.append({
                "timestamp": row[0],
                "cpu_percent": row[1],
                "memory_percent": row[2],
                "memory_used": row[3],
                "memory_total": row[4],
                "disk_percent": row[5],
                "network_sent": row[6],
                "network_recv": row[7],
                "load_avg_1m": row[8],
                "load_avg_5m": row[9],
                "load_avg_15m": row[10],
                "processes_running": row[11],
                "processes_total": row[12],
                "uptime_seconds": row[13]
            })
        
        return {"metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics history: {str(e)}")


@app.get("/api/system/info")
async def get_system_info():
    """Get comprehensive system information"""
    try:
        proc_collector = ProcMetricsCollector()
        uname = platform.uname()
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        
        info = {
            "system": uname.system,
            "node": uname.node,
            "release": uname.release,
            "version": uname.version,
            "machine": uname.machine,
            "processor": uname.processor,
            "boot_time": boot_time.isoformat(),
            "cpu_count": psutil.cpu_count(),
            "cpu_count_logical": psutil.cpu_count(logical=True),
            "is_linux": proc_collector.is_linux
        }
        
        # Add Linux-specific info
        if proc_collector.is_linux:
            uptime = proc_collector.get_proc_uptime()
            if uptime:
                info["uptime_seconds"] = uptime.get('uptime_seconds')
                info["uptime_formatted"] = str(timedelta(seconds=int(uptime.get('uptime_seconds', 0))))
        
        return info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system info: {str(e)}")


@app.get("/api/proc/detailed")
async def get_detailed_proc_info():
    """Get detailed /proc filesystem information (Linux only)"""
    proc_collector = ProcMetricsCollector()
    
    if not proc_collector.is_linux:
        raise HTTPException(status_code=404, detail="Detailed /proc info only available on Linux")
    
    try:
        return {
            "stat": proc_collector.get_proc_stat(),
            "meminfo": proc_collector.get_proc_meminfo(),
            "loadavg": proc_collector.get_proc_loadavg(),
            "uptime": proc_collector.get_proc_uptime(),
            "diskstats": proc_collector.get_proc_diskstats(),
            "net_dev": proc_collector.get_proc_net_dev(),
            "cpuinfo": proc_collector.get_proc_cpuinfo()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get detailed proc info: {str(e)}")


@app.get("/api/proc/cpuinfo")
async def get_cpu_info():
    """Get CPU information from /proc/cpuinfo (Linux only)"""
    proc_collector = ProcMetricsCollector()
    
    if not proc_collector.is_linux:
        raise HTTPException(status_code=404, detail="CPU info from /proc only available on Linux")
    
    try:
        return {"cpuinfo": proc_collector.get_proc_cpuinfo()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get CPU info: {str(e)}")


@app.get("/api/proc/network")
async def get_network_interfaces():
    """Get network interface statistics from /proc/net/dev (Linux only)"""
    proc_collector = ProcMetricsCollector()
    
    if not proc_collector.is_linux:
        raise HTTPException(status_code=404, detail="Network interface info from /proc only available on Linux")
    
    try:
        return {"interfaces": proc_collector.get_proc_net_dev()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get network interface info: {str(e)}")


@app.get("/api/proc/disk")
async def get_disk_stats():
    """Get disk statistics from /proc/diskstats (Linux only)"""
    proc_collector = ProcMetricsCollector()
    
    if not proc_collector.is_linux:
        raise HTTPException(status_code=404, detail="Disk stats from /proc only available on Linux")
    
    try:
        return {"diskstats": proc_collector.get_proc_diskstats()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get disk stats: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Enhanced System Monitor API", 
        "version": "2.0.0",
        "features": [
            "Cross-platform metrics via psutil",
            "Linux /proc filesystem support",
            "Auto-detection of system type",
            "Comprehensive system statistics",
            "Real-time data collection"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
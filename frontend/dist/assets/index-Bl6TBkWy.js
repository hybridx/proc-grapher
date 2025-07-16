import{C as c,a as h,L as p,P as g,b as f,B as y,p as b,c as C,d as _,T as w}from"./vendor-tyIJ3bE-.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))s(t);new MutationObserver(t=>{for(const i of t)if(i.type==="childList")for(const n of i.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&s(n)}).observe(document,{childList:!0,subtree:!0});function o(t){const i={};return t.integrity&&(i.integrity=t.integrity),t.referrerPolicy&&(i.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?i.credentials="include":t.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(t){if(t.ep)return;t.ep=!0;const i=o(t);fetch(t.href,i)}})();c.register(h,p,g,f,y,b,C,_,w);class ${constructor(){this.baseUrl="",this.isConnected=!1,this.isLinux=!1,this.charts={},this.currentHours=1,this.updateInterval=null,this.connectionTimeout=1e4,this.init()}init(){this.setupEventListeners(),this.loadStoredConnection()}setupEventListeners(){const e=document.getElementById("connect-btn"),o=document.getElementById("backend-host"),s=document.getElementById("backend-port");e.addEventListener("click",()=>{const i=o.value.trim()||"localhost",n=parseInt(s.value)||8e3;this.connect(i,n)}),[o,s].forEach(i=>{i.addEventListener("keypress",n=>{n.key==="Enter"&&e.click()})});const t=document.querySelectorAll(".btn[data-hours]");t.forEach(i=>{i.addEventListener("click",async n=>{this.isConnected&&(t.forEach(r=>r.classList.remove("active")),n.target.classList.add("active"),this.currentHours=parseInt(n.target.dataset.hours),await this.loadHistoricalData())})})}loadStoredConnection(){const e=localStorage.getItem("procgrapher_host"),o=localStorage.getItem("procgrapher_port");e&&(document.getElementById("backend-host").value=e),o&&(document.getElementById("backend-port").value=o)}storeConnection(e,o){localStorage.setItem("procgrapher_host",e),localStorage.setItem("procgrapher_port",o)}async connect(e,o){const s=document.getElementById("connect-btn"),t=document.getElementById("status-indicator"),i=document.getElementById("connection-text");s.disabled=!0,s.textContent="Connecting...",i.textContent="Connecting...",this.baseUrl=`http://${e}:${o}`;try{const n=new AbortController,r=setTimeout(()=>n.abort(),this.connectionTimeout),a=await fetch(`${this.baseUrl}/`,{signal:n.signal});if(clearTimeout(r),!a.ok)throw new Error(`HTTP ${a.status}`);const d=await a.json();this.isConnected=!0,t.classList.add("connected"),i.textContent=`Connected to ${e}:${o}`,s.textContent="Disconnect",s.disabled=!1,this.storeConnection(e,o),await this.loadSystemInfo(),await this.loadCurrentMetrics(),await this.loadHistoricalData(),await this.loadProcData(),this.showConnectedSections(),this.startRealTimeUpdates(),s.onclick=()=>this.disconnect()}catch(n){console.error("Connection failed:",n),this.handleConnectionError(n),s.disabled=!1,s.textContent="Connect",i.textContent="Connection failed"}}disconnect(){this.isConnected=!1,this.stopRealTimeUpdates();const e=document.getElementById("status-indicator"),o=document.getElementById("connection-text"),s=document.getElementById("connect-btn");e.classList.remove("connected"),o.textContent="Disconnected",s.textContent="Connect",s.onclick=()=>{const t=document.getElementById("backend-host").value.trim()||"localhost",i=parseInt(document.getElementById("backend-port").value)||8e3;this.connect(t,i)},this.hideConnectedSections(),this.destroyCharts()}handleConnectionError(e){let o="Connection failed";e.name==="AbortError"?o="Connection timeout":e.message.includes("fetch")&&(o="Network error"),document.getElementById("connection-text").textContent=o}showConnectedSections(){document.getElementById("systemInfo").style.display="block",document.getElementById("metricsGrid").style.display="grid",document.getElementById("chartControls").style.display="flex",document.getElementById("chartsContainer").style.display="grid",this.isLinux&&document.querySelectorAll(".linux-only").forEach(e=>{e.classList.add("show")})}hideConnectedSections(){document.getElementById("systemInfo").style.display="none",document.getElementById("metricsGrid").style.display="none",document.getElementById("chartControls").style.display="none",document.getElementById("chartsContainer").style.display="none",document.querySelectorAll(".linux-only").forEach(e=>{e.classList.remove("show")})}async apiCall(e){if(!this.isConnected)throw new Error("Not connected");const o=await fetch(`${this.baseUrl}${e}`);if(!o.ok)throw new Error(`HTTP ${o.status}`);return o.json()}async loadSystemInfo(){try{const e=await this.apiCall("/api/system/info");this.isLinux=e.is_linux,this.renderSystemInfo(e)}catch(e){console.error("Error loading system info:",e),document.getElementById("systemInfoGrid").innerHTML='<div class="error">Failed to load system information</div>'}}renderSystemInfo(e){const o=document.getElementById("systemInfoGrid"),s=i=>{if(!i)return"Unknown";const n=Math.floor(i/86400),r=Math.floor(i%86400/3600),a=Math.floor(i%3600/60);return`${n}d ${r}h ${a}m`};let t="";e.uptime_seconds&&(t=`
                <div class="info-item">
                    <div class="info-label">Uptime</div>
                    <div class="info-value">${s(e.uptime_seconds)}</div>
                </div>
            `),o.innerHTML=`
            <div class="info-item">
                <div class="info-label">System</div>
                <div class="info-value">${e.system} ${this.isLinux?"🐧":""}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Node</div>
                <div class="info-value">${e.node}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Release</div>
                <div class="info-value">${e.release}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Architecture</div>
                <div class="info-value">${e.machine}</div>
            </div>
            <div class="info-item">
                <div class="info-label">CPU Cores</div>
                <div class="info-value">${e.cpu_count} (${e.cpu_count_logical} logical)</div>
            </div>
            <div class="info-item">
                <div class="info-label">Boot Time</div>
                <div class="info-value">${new Date(e.boot_time).toLocaleString()}</div>
            </div>
            ${t}
        `}async loadCurrentMetrics(){try{const e=await this.apiCall("/api/metrics/current");this.renderCurrentMetrics(e)}catch(e){console.error("Error loading current metrics:",e),document.getElementById("metricsGrid").innerHTML='<div class="error">Failed to load current metrics</div>'}}renderCurrentMetrics(e){var n,r,a,d;const o=document.getElementById("metricsGrid"),s=l=>{const v=["Bytes","KB","MB","GB","TB"];if(l===0)return"0 Bytes";const m=Math.floor(Math.log(l)/Math.log(1024));return Math.round(l/Math.pow(1024,m)*100)/100+" "+v[m]};let t="";this.isLinux&&e.load_avg_1m!==null&&(t=`
                <div class="metric-card">
                    <h3>Load Average</h3>
                    <div class="metric-value">${((n=e.load_avg_1m)==null?void 0:n.toFixed(2))||"N/A"}</div>
                    <div class="metric-detail">
                        1m: ${((r=e.load_avg_1m)==null?void 0:r.toFixed(2))||"N/A"} | 
                        5m: ${((a=e.load_avg_5m)==null?void 0:a.toFixed(2))||"N/A"} | 
                        15m: ${((d=e.load_avg_15m)==null?void 0:d.toFixed(2))||"N/A"}
                    </div>
                </div>
            `);let i="";this.isLinux&&e.processes_running!==null&&(i=`
                <div class="metric-card">
                    <h3>Processes</h3>
                    <div class="metric-value">${e.processes_running||0}</div>
                    <div class="metric-detail">
                        Running: ${e.processes_running||0} | 
                        Total: ${e.processes_total||0}
                    </div>
                </div>
            `),o.innerHTML=`
            <div class="metric-card">
                <h3>CPU Usage</h3>
                <div class="metric-value">${e.cpu_percent.toFixed(1)}%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${e.cpu_percent}%; background: ${this.getColorForPercentage(e.cpu_percent)}"></div>
                </div>
            </div>
            <div class="metric-card">
                <h3>Memory Usage</h3>
                <div class="metric-value">${e.memory_percent.toFixed(1)}%</div>
                <div class="metric-detail">
                    ${s(e.memory_used)} / ${s(e.memory_total)}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${e.memory_percent}%; background: ${this.getColorForPercentage(e.memory_percent)}"></div>
                </div>
            </div>
            <div class="metric-card">
                <h3>Disk Usage</h3>
                <div class="metric-value">${e.disk_percent.toFixed(1)}%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${e.disk_percent}%; background: ${this.getColorForPercentage(e.disk_percent)}"></div>
                </div>
            </div>
            <div class="metric-card">
                <h3>Network I/O</h3>
                <div class="metric-detail">
                    <div>📤 ${s(e.network_sent)}</div>
                    <div>📥 ${s(e.network_recv)}</div>
                </div>
            </div>
            ${t}
            ${i}
        `}getColorForPercentage(e){return e<50?"#48bb78":e<80?"#ed8936":"#f56565"}async loadHistoricalData(){try{const e=await this.apiCall(`/api/metrics/history?hours=${this.currentHours}`);this.renderOverviewChart(e.metrics),this.isLinux&&this.renderLoadChart(e.metrics)}catch(e){console.error("Error loading historical data:",e)}}renderOverviewChart(e){const o=document.getElementById("overviewChart").getContext("2d");this.charts.overview&&this.charts.overview.destroy();const s=e.map(t=>new Date(t.timestamp));this.charts.overview=new c(o,{type:"line",data:{labels:s,datasets:[{label:"CPU %",data:e.map(t=>t.cpu_percent),borderColor:"#4299e1",backgroundColor:"rgba(66, 153, 225, 0.1)",tension:.4,fill:!1},{label:"Memory %",data:e.map(t=>t.memory_percent),borderColor:"#48bb78",backgroundColor:"rgba(72, 187, 120, 0.1)",tension:.4,fill:!1},{label:"Disk %",data:e.map(t=>t.disk_percent),borderColor:"#ed8936",backgroundColor:"rgba(237, 137, 54, 0.1)",tension:.4,fill:!1}]},options:{responsive:!0,maintainAspectRatio:!1,interaction:{intersect:!1,mode:"index"},plugins:{legend:{position:"top"},tooltip:{callbacks:{label:function(t){return`${t.dataset.label}: ${t.parsed.y.toFixed(1)}%`}}}},scales:{x:{type:"time",time:{displayFormats:{minute:"HH:mm",hour:"HH:mm"}},title:{display:!0,text:"Time"}},y:{beginAtZero:!0,max:100,title:{display:!0,text:"Percentage (%)"}}}}})}renderLoadChart(e){if(!this.isLinux)return;const o=document.getElementById("loadChart").getContext("2d");this.charts.load&&this.charts.load.destroy();const s=e.map(i=>new Date(i.timestamp));e.filter(i=>i.load_avg_1m!==null).length!==0&&(this.charts.load=new c(o,{type:"line",data:{labels:s,datasets:[{label:"1 min",data:e.map(i=>i.load_avg_1m),borderColor:"#f56565",backgroundColor:"rgba(245, 101, 101, 0.1)",tension:.4,fill:!1},{label:"5 min",data:e.map(i=>i.load_avg_5m),borderColor:"#ed8936",backgroundColor:"rgba(237, 137, 54, 0.1)",tension:.4,fill:!1},{label:"15 min",data:e.map(i=>i.load_avg_15m),borderColor:"#38b2ac",backgroundColor:"rgba(56, 178, 172, 0.1)",tension:.4,fill:!1}]},options:{responsive:!0,maintainAspectRatio:!1,interaction:{intersect:!1,mode:"index"},plugins:{legend:{position:"top"},tooltip:{callbacks:{label:function(i){var n;return`${i.dataset.label}: ${((n=i.parsed.y)==null?void 0:n.toFixed(2))||"N/A"}`}}}},scales:{x:{type:"time",time:{displayFormats:{minute:"HH:mm",hour:"HH:mm"}},title:{display:!0,text:"Time"}},y:{beginAtZero:!0,title:{display:!0,text:"Load Average"}}}}}))}async loadProcData(){if(this.isLinux)try{const[e,o,s]=await Promise.all([this.apiCall("/api/proc/detailed"),this.apiCall("/api/proc/network"),this.apiCall("/api/proc/disk")]);this.renderProcessStats(e.stat),this.renderNetworkInterfaces(o.interfaces),this.renderDiskStats(s.diskstats)}catch(e){console.error("Error loading proc data:",e)}}renderProcessStats(e){const o=document.getElementById("processStats"),s=t=>t>=1e6?(t/1e6).toFixed(1)+"M":t>=1e3?(t/1e3).toFixed(1)+"K":(t==null?void 0:t.toString())||"N/A";o.innerHTML=`
            <div class="info-item">
                <div class="info-label">Running</div>
                <div class="info-value">${e.processes_running||"N/A"}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Total</div>
                <div class="info-value">${e.processes_total||"N/A"}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Blocked</div>
                <div class="info-value">${e.processes_blocked||"N/A"}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Interrupts</div>
                <div class="info-value">${s(e.interrupts_total)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Context Switches</div>
                <div class="info-value">${s(e.context_switches)}</div>
            </div>
        `}renderNetworkInterfaces(e){const o=document.getElementById("networkInterfaces"),s=t=>{const i=["B","KB","MB","GB","TB"];if(t===0)return"0 B";const n=Math.floor(Math.log(t)/Math.log(1024));return Math.round(t/Math.pow(1024,n)*100)/100+" "+i[n]};if(!e||e.length===0){o.innerHTML='<div class="loading">No network interfaces found</div>';return}o.innerHTML=e.filter(t=>t.interface!=="lo").map(t=>`
                <div class="interface-card">
                    <h5>${t.interface}</h5>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                        <div>
                            <strong>RX:</strong><br>
                            📥 ${s(t.rx_bytes)}<br>
                            📦 ${t.rx_packets.toLocaleString()} packets<br>
                            ❌ ${t.rx_errors} errors
                        </div>
                        <div>
                            <strong>TX:</strong><br>
                            📤 ${s(t.tx_bytes)}<br>
                            📦 ${t.tx_packets.toLocaleString()} packets<br>
                            ❌ ${t.tx_errors} errors
                        </div>
                    </div>
                </div>
            `).join("")}renderDiskStats(e){const o=document.getElementById("diskStats");if(!e||e.length===0){o.innerHTML='<div class="loading">No disk statistics found</div>';return}const s=e.filter(t=>/^(sd[a-z]|hd[a-z]|nvme\d+n\d+|vd[a-z])$/.test(t.device));o.innerHTML=s.map(t=>`
            <div class="disk-card">
                <h5>/dev/${t.device}</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                    <div>
                        <strong>Reads:</strong><br>
                        📖 ${t.reads_completed.toLocaleString()}<br>
                        📊 ${(t.sectors_read*512/1024/1024).toFixed(1)} MB<br>
                        ⏱️ ${t.read_time_ms.toLocaleString()} ms
                    </div>
                    <div>
                        <strong>Writes:</strong><br>
                        ✏️ ${t.writes_completed.toLocaleString()}<br>
                        📊 ${(t.sectors_written*512/1024/1024).toFixed(1)} MB<br>
                        ⏱️ ${t.write_time_ms.toLocaleString()} ms
                    </div>
                </div>
            </div>
        `).join("")}startRealTimeUpdates(){this.updateInterval&&clearInterval(this.updateInterval),this.updateInterval=setInterval(async()=>{if(this.isConnected)try{await this.loadCurrentMetrics(),Date.now()%6e4<5e3&&(await this.loadHistoricalData(),this.isLinux&&await this.loadProcData())}catch(e){console.error("Error during real-time update:",e)}},5e3)}stopRealTimeUpdates(){this.updateInterval&&(clearInterval(this.updateInterval),this.updateInterval=null)}destroyCharts(){Object.values(this.charts).forEach(e=>{e&&e.destroy()}),this.charts={}}destroy(){this.stopRealTimeUpdates(),this.destroyCharts()}}document.addEventListener("DOMContentLoaded",()=>{window.procGrapher=new $});window.addEventListener("beforeunload",()=>{window.procGrapher&&window.procGrapher.destroy()});
//# sourceMappingURL=index-Bl6TBkWy.js.map

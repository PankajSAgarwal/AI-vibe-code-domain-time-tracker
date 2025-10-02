document.addEventListener('DOMContentLoaded', async () => {
    await loadTodayData();
  
    // Set current date
    document.getElementById('current-date').textContent = 
      new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
  
    // Event listeners
    document.getElementById('clear-btn').addEventListener('click', clearData);
    document.getElementById('export-btn').addEventListener('click', exportData);
  
    // Auto-refresh every 5 seconds
    setInterval(loadTodayData, 5000);
  });
  
  async function loadTodayData() {
    const today = new Date().toDateString();
    const result = await chrome.storage.local.get([today]);
    const todayData = result[today] || {};
  
    displayData(todayData);
  }
  
  function displayData(data) {
    const domainList = document.getElementById('domain-list');
    const totalTimeElement = document.getElementById('total-time');
  
    // Calculate total time
    let totalMs = 0;
    Object.values(data).forEach(time => totalMs += time);
  
    if (totalMs === 0) {
      domainList.innerHTML = `
        <div class="no-data">
          <div>📊</div>
          <h3>No data yet!</h3>
          <p>Start browsing to see your time tracking</p>
        </div>
      `;
      totalTimeElement.textContent = '0h 0m';
      return;
    }
  
    // Update total time
    totalTimeElement.textContent = formatTime(totalMs);
  
    // Sort domains by time spent
    const sortedDomains = Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Show top 10
  
    // Generate domain list HTML
    const html = sortedDomains.map(([domain, timeMs]) => {
      const percentage = ((timeMs / totalMs) * 100).toFixed(1);
      const timeStr = formatTime(timeMs);
      const favicon = getFaviconUrl(domain);
  
      return `
        <div class="domain-item">
          <div class="domain-info">
            <div class="domain-name">
              <img src="${favicon}" width="16" height="16" style="margin-right: 8px; vertical-align: middle;" 
                   onerror="this.style.display='none'">
              ${domain}
            </div>
            <div class="domain-time">${timeStr}</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${percentage}%"></div>
            </div>
          </div>
          <div class="domain-percentage">${percentage}%</div>
        </div>
      `;
    }).join('');
  
    domainList.innerHTML = html;
  }
  
  function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
  
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
  
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }
  
  function getFaviconUrl(domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  }
  
  async function clearData() {
    if (confirm('Are you sure you want to clear all tracking data?')) {
      await chrome.storage.local.clear();
      await loadTodayData();
    }
  }
  
  async function exportData() {
    const today = new Date().toDateString();
    const result = await chrome.storage.local.get([today]);
    const todayData = result[today] || {};
  
    let csvContent = 'Domain,Time (minutes),Percentage\n';
    let totalMs = 0;
  
    Object.values(todayData).forEach(time => totalMs += time);
  
    Object.entries(todayData)
      .sort((a, b) => b[1] - a[1])
      .forEach(([domain, timeMs]) => {
        const minutes = Math.round(timeMs / 60000);
        const percentage = ((timeMs / totalMs) * 100).toFixed(1);
        csvContent += `${domain},${minutes},${percentage}%\n`;
      });
  
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
  
    chrome.downloads.download({
      url: url,
      filename: `domain-tracking-${new Date().toISOString().split('T')[0]}.csv`
    });
  }
let currentDomain = null;
let startTime = null;
let updateInterval = null;

// Track active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  handleTabChange(tab.url);
});

// Track URL changes within the same tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active && tab.url) {
    handleTabChange(tab.url);
  }
});

// Track when window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Window lost focus
    stopTracking();
  } else {
    // Window gained focus
    const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
    if (tabs.length > 0 && tabs[0].url) {
      handleTabChange(tabs[0].url);
    }
  }
});

function handleTabChange(url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    stopTracking();
    return;
  }

  const domain = extractDomain(url);

  if (domain !== currentDomain) {
    stopTracking();
    startTracking(domain);
  }
}

function startTracking(domain) {
  currentDomain = domain;
  startTime = Date.now();

  // Update every second
  updateInterval = setInterval(() => {
    updateTimeSpent();
  }, 1000);
}

function stopTracking() {
  if (currentDomain && startTime) {
    updateTimeSpent();
  }

  currentDomain = null;
  startTime = null;

  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

async function updateTimeSpent() {
  if (!currentDomain || !startTime) return;

  const timeSpent = Date.now() - startTime;
  const today = new Date().toDateString();

  // Get existing data
  const result = await chrome.storage.local.get([today]);
  const todayData = result[today] || {};

  // Update domain time
  if (!todayData[currentDomain]) {
    todayData[currentDomain] = 0;
  }

  todayData[currentDomain] += timeSpent;

   // Save updated data
   await chrome.storage.local.set({ [today]: todayData });

   // Reset start time
   startTime = Date.now();
 }
 
 function extractDomain(url) {
   try {
     const urlObj = new URL(url);
     return urlObj.hostname.replace('www.', '');
   } catch (e) {
     return 'Unknown';
   }
 }
 
 // Initialize tracking when extension starts
 chrome.runtime.onStartup.addListener(async () => {
   const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
   if (tabs.length > 0 && tabs[0].url) {
     handleTabChange(tabs[0].url);
   }
 });
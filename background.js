let isActive = false;

console.log('Background script is loading...');

// 点击图标时切换状态
chrome.action.onClicked.addListener(async (tab) => {
  const hostname = new URL(tab.url).hostname;
  
  try {
    // 获取当前网站的状态
    const result = await chrome.storage.local.get(['splitViewStates']);
    const states = result.splitViewStates || {};
    isActive = !states[hostname];
    
    // 发送状态到内容脚本
    await chrome.tabs.sendMessage(tab.id, {
      action: 'toggleSplitView',
      state: isActive,
      hostname: hostname
    });
    
    // 更新存储的状态
    states[hostname] = isActive;
    await chrome.storage.local.set({ splitViewStates: states });
    
  } catch (error) {
    if (error.message.includes('Receiving end does not exist')) {
      // 如果内容脚本未加载，先注入内容脚本
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-script.js']
      });
      
      // 重新尝试发送消息
      await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleSplitView',
        state: isActive,
        hostname: hostname
      });
      
      // 更新存储的状态
      const result = await chrome.storage.local.get(['splitViewStates']);
      const states = result.splitViewStates || {};
      states[hostname] = isActive;
      await chrome.storage.local.set({ splitViewStates: states });
    } else {
      console.error('Error:', error);
    }
  }
  
  // 更新图标状态
  updateIcon(isActive);
});

// 更新图标视觉反馈
function updateIcon(active) {
  const path = active ? {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  } : {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  };
  chrome.action.setIcon({ path });
}

// 保存和恢复状态
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ splitViewStates: {} });
});

// 处理来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'saveScrollPosition') {
    chrome.storage.local.set({ scrollPosition: message.position });
  }
});

console.log('Background script loaded successfully');
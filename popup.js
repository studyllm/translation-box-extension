// 等待 DOM 完全加载
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing popup...');
  
  // 获取按钮元素
  const enableBtn = document.getElementById('enableBtn');
  const disableBtn = document.getElementById('disableBtn');
  const statusDiv = document.getElementById('status');

  // 检查元素是否存在
  if (!enableBtn || !disableBtn || !statusDiv) {
    console.error('Required elements not found:', {
      enableBtn: !!enableBtn,
      disableBtn: !!disableBtn,
      statusDiv: !!statusDiv
    });
    return;
  }

  let states = {};

  // 检查是否是首次安装
  chrome.storage.local.get(['isFirstInstall'], async (result) => {
    if (!result.isFirstInstall) {
      // 显示首次安装通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '欢迎使用分屏插件',
        message: '为了更方便地使用分屏功能，建议将插件固定在工具栏上。请查看插件界面下方的固定说明。',
        priority: 2
      });
      
      // 标记已不是首次安装
      chrome.storage.local.set({ isFirstInstall: true });
    }
  });

  try {
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error('No active tab found');
    }

    // 获取当前网站的主机名
    const hostname = new URL(tab.url).hostname;
    console.log('Current hostname:', hostname);

    // 获取当前分屏状态
    const result = await chrome.storage.local.get('splitViewStates');
    states = result.splitViewStates || {};
    console.log('Current states:', states);

    // 初始化按钮状态
    const isEnabled = states[hostname] || false;
    console.log('Initial state:', { hostname, isEnabled });
    
    // 显示对应的按钮
    if (isEnabled) {
      disableBtn.style.display = 'block';
      enableBtn.style.display = 'none';
    } else {
      enableBtn.style.display = 'block';
      disableBtn.style.display = 'none';
    }

    // 更新状态显示
    updateStatus(hostname);

    // 启用按钮点击事件
    enableBtn.addEventListener('click', async () => {
      try {
        states[hostname] = true;
        await chrome.storage.local.set({ splitViewStates: states });
        
        // 发送消息到content script
        await chrome.tabs.sendMessage(tab.id, {
          action: 'toggleSplitView',
          state: true,
          hostname: hostname
        });
        
        updateStatus(hostname);
        window.close();
      } catch (error) {
        console.error('Error enabling split view:', error);
        // 如果content script未注入，尝试注入
        if (error.message.includes('Could not establish connection')) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content-script.js']
            });
            // 重新启用分屏
            states[hostname] = true;
            await chrome.storage.local.set({ splitViewStates: states });
            await chrome.tabs.sendMessage(tab.id, {
              action: 'toggleSplitView',
              state: true,
              hostname: hostname
            });
            updateStatus(hostname);
            window.close();
          } catch (injectError) {
            console.error('Error injecting content script:', injectError);
            statusDiv.textContent = '启用失败，请刷新页面后重试';
          }
        } else {
          statusDiv.textContent = '启用失败，请刷新页面后重试';
        }
      }
    });

    // 禁用按钮点击事件
    disableBtn.addEventListener('click', async () => {
      try {
        states[hostname] = false;
        await chrome.storage.local.set({ splitViewStates: states });
        
        // 发送消息到content script
        await chrome.tabs.sendMessage(tab.id, {
          action: 'toggleSplitView',
          state: false,
          hostname: hostname
        });
        
        updateStatus(hostname);
        window.close();
      } catch (error) {
        console.error('Error disabling split view:', error);
        statusDiv.textContent = '关闭失败，请刷新页面后重试';
      }
    });

  } catch (error) {
    console.error('Error in popup initialization:', error);
    statusDiv.textContent = '获取状态失败，请刷新页面后重试';
  }

  function updateStatus(hostname) {
    const isEnabled = states[hostname] || false;
    console.log('Updating status:', { hostname, isEnabled });
    
    // 更新状态文本
    statusDiv.textContent = isEnabled ? '分屏模式已启用' : '分屏模式已关闭';
    
    // 更新按钮显示状态
    if (isEnabled) {
      enableBtn.style.display = 'none';
      disableBtn.style.display = 'block';
    } else {
      enableBtn.style.display = 'block';
      disableBtn.style.display = 'none';
    }
  }
});

// 切换分屏状态
async function toggleSplitView() {
  try {
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.error('No active tab found');
      return;
    }

    // 获取当前网站的主机名
    const hostname = new URL(tab.url).hostname;
    console.log('Current hostname:', hostname);

    // 获取当前状态
    const result = await chrome.storage.local.get(['splitViewStates']);
    const states = result.splitViewStates || {};
    const currentState = states[hostname] || false;

    // 切换状态
    const newState = !currentState;
    console.log('Toggling split view:', { hostname, newState });

    // 更新存储的状态
    states[hostname] = newState;
    await chrome.storage.local.set({ splitViewStates: states });

    // 发送消息到内容脚本
    await chrome.tabs.sendMessage(tab.id, {
      action: 'toggleSplitView',
      state: newState,
      hostname: hostname
    });

    // 更新按钮状态
    updateButtonState(newState);
    
    // 自动关闭插件
    window.close();
  } catch (error) {
    console.error('Error toggling split view:', error);
  }
} 
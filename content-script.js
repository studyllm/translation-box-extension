console.log('Content script is loading...');

// 使用 window 对象来存储状态，避免重复声明
if (!window.splitViewState) {
  console.log('Initializing split view state...');
  window.splitViewState = {
    isActive: false,
    hostname: window.location.hostname
  };
}

const splitViewContainerId = 'split-view-container';
const dividerId = 'split-view-divider';

// 创建分屏视图
function createSplitView() {
  console.log('Creating split view...');
  if (window.splitViewState.isActive) {
    console.log('Split view is already active');
    return;
  }
  
  // 保存原始页面状态
  const originalScrollY = window.scrollY;
  
  console.log('Creating container...');
  // 创建分屏容器
  const container = document.createElement('div');
  container.id = splitViewContainerId;
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 999999;
    background: white;
  `;
  
  console.log('Creating panes...');
  // 创建左栏
  const leftPane = createPane(window.location.href, 'left-pane');
  leftPane.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    min-width: 200px;
    width: 50%;
    border: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    overflow-x: hidden;
  `;
  
  // 创建右栏
  const rightPane = createPane(window.location.href, 'right-pane');
  rightPane.style.cssText = `
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    min-width: 200px;
    width: 50%;
    border: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    overflow-x: hidden;
  `;
  
  console.log('Creating divider...');
  // 创建可拖动的分割线
  const divider = document.createElement('div');
  divider.id = dividerId;
  divider.style.cssText = `
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    height: 100%;
    width: 12px;
    background: #e0e0e0;
    cursor: col-resize;
    z-index: 1000001;
    border-left: 1px solid #ccc;
    border-right: 1px solid #ccc;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
  `;
  
  // 创建提示元素
  const tooltip = document.createElement('div');
  tooltip.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
    white-space: nowrap;
    z-index: 1000002;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  `;
  tooltip.textContent = '拖动调整宽度';
  divider.appendChild(tooltip);
  
  // 设置拖拽功能
  let isDragging = false;
  let startX = 0;
  let startLeftWidth = 0;
  const MIN_PANE_WIDTH = 200;
  const DIVIDER_WIDTH = 12;
  
  // 鼠标悬停效果
  divider.addEventListener('mouseenter', () => {
    console.log('Divider mouse enter');
    divider.style.backgroundColor = '#bdbdbd';
    tooltip.style.opacity = '1';
  });
  
  divider.addEventListener('mouseleave', () => {
    console.log('Divider mouse leave');
    if (!isDragging) {
      divider.style.backgroundColor = '#e0e0e0';
      tooltip.style.opacity = '0';
    }
  });
  
  // 开始拖拽
  divider.addEventListener('mousedown', (e) => {
    console.log('Divider mousedown event triggered');
    e.preventDefault();
    isDragging = true;
    startX = e.clientX;
    startLeftWidth = leftPane.offsetWidth;
    tooltip.style.opacity = '0';
    
    // 添加拖拽时的样式
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    divider.style.backgroundColor = '#9e9e9e';
    
    // 添加临时遮罩层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000000;
      cursor: col-resize;
    `;
    document.body.appendChild(overlay);
    
    // 拖拽过程
    const onMouseMove = (e) => {
      if (!isDragging) return;
      
      const containerWidth = container.offsetWidth;
      const deltaX = e.clientX - startX;
      let newLeftWidth = startLeftWidth + deltaX;
      
      // 限制最小宽度
      newLeftWidth = Math.max(MIN_PANE_WIDTH, newLeftWidth);
      newLeftWidth = Math.min(containerWidth - MIN_PANE_WIDTH - DIVIDER_WIDTH, newLeftWidth);
      
      // 计算右窗格宽度
      const rightWidth = containerWidth - newLeftWidth - DIVIDER_WIDTH;
      
      // 更新窗格宽度和位置
      leftPane.style.width = `${newLeftWidth}px`;
      divider.style.left = `${newLeftWidth}px`;
      rightPane.style.left = `${newLeftWidth + DIVIDER_WIDTH}px`;
      rightPane.style.width = `${rightWidth}px`;
      
      // 保存当前比例
      const ratio = newLeftWidth / containerWidth;
      savePaneRatio(ratio);
    };
    
    // 结束拖拽
    const onMouseUp = () => {
      if (!isDragging) return;
      
      isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      divider.style.backgroundColor = '#e0e0e0';
      
      // 移除遮罩层
      overlay.remove();
      
      // 移除事件监听器
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    // 添加事件监听器
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
  
  console.log('Appending elements...');
  container.appendChild(leftPane);
  container.appendChild(divider);
  container.appendChild(rightPane);
  document.body.appendChild(container);
  
  // 隐藏原始页面
  document.documentElement.style.overflow = 'hidden';
  
  // 添加自定义滚动条样式
  const style = document.createElement('style');
  style.textContent = `
    #left-pane::-webkit-scrollbar,
    #right-pane::-webkit-scrollbar {
      width: 8px;
      background-color: #f1f1f1;
    }
    
    #left-pane::-webkit-scrollbar-thumb,
    #right-pane::-webkit-scrollbar-thumb {
      background-color: #888;
      border-radius: 4px;
    }
    
    #left-pane::-webkit-scrollbar-thumb:hover,
    #right-pane::-webkit-scrollbar-thumb:hover {
      background-color: #555;
    }
  `;
  document.head.appendChild(style);
  
  console.log('Setting up scroll sync...');
  // 设置初始滚动位置
  setTimeout(() => {
    console.log('Setting initial scroll position:', originalScrollY);
    leftPane.contentWindow.scrollTo(0, originalScrollY);
    rightPane.contentWindow.scrollTo(0, originalScrollY);
    setupSyncScrolling(leftPane, rightPane);
    restorePaneRatio(); // 恢复保存的比例
  }, 500);
  
  window.splitViewState.isActive = true;
  console.log('Split view created successfully');
}

// 创建单个窗格
function createPane(url, id) {
  console.log('Creating pane:', id);
  const iframe = document.createElement('iframe');
  iframe.id = id;
  iframe.src = url;
  iframe.allow = 'fullscreen'; // 修改 allow 属性
  iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms allow-presentation'; // 添加更多必要的权限
  return iframe;
}

// 设置同步滚动
function setupSyncScrolling(leftPane, rightPane) {
  let isSyncing = false;
  let lastScrollTime = 0;
  let lastScrollPosition = { x: 0, y: 0 };
  const THROTTLE_DELAY = 50; // 增加延迟到50ms
  
  // 防抖函数
  function debounce(callback, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        callback.apply(this, args);
      }, delay);
    };
  }
  
  // 获取精确的滚动位置
  function getScrollPosition(iframe) {
    const win = iframe.contentWindow;
    return {
      x: win.pageXOffset || win.scrollX,
      y: win.pageYOffset || win.scrollY
    };
  }
  
  // 同步滚动位置
  const syncScroll = debounce((source, target) => {
    if (isSyncing) return;
    
    const currentScroll = getScrollPosition(source);
    const scrollDiff = Math.abs(currentScroll.y - lastScrollPosition.y);
    
    // 只有当滚动差异超过5像素时才同步
    if (scrollDiff > 5) {
      isSyncing = true;
      
      try {
        // 保存滚动位置到存储
        chrome.runtime.sendMessage({
          type: 'saveScrollPosition',
          position: currentScroll
        }).catch(error => {
          if (!error.message.includes('Extension context invalidated')) {
            console.error('Error saving scroll position:', error);
          }
        });
        
        // 直接设置滚动位置，不使用动画
        target.contentWindow.scrollTo(currentScroll.x, currentScroll.y);
        lastScrollPosition = currentScroll;
      } catch (error) {
        if (!error.message.includes('Extension context invalidated')) {
          console.error('Error syncing scroll:', error);
        }
      } finally {
        // 使用较长的延迟来确保状态重置
        setTimeout(() => {
          isSyncing = false;
        }, 100);
      }
    }
  }, THROTTLE_DELAY);

  // 添加滚动事件监听器
  const leftScrollHandler = () => {
    if (!isSyncing) {
      syncScroll(leftPane, rightPane);
    }
  };
  
  const rightScrollHandler = () => {
    if (!isSyncing) {
      syncScroll(rightPane, leftPane);
    }
  };
  
  // 使用 passive 监听器提高性能
  leftPane.contentWindow.addEventListener('scroll', leftScrollHandler, { passive: true });
  rightPane.contentWindow.addEventListener('scroll', rightScrollHandler, { passive: true });
  
  // 初始化滚动位置
  lastScrollPosition = getScrollPosition(leftPane);
  
  // 清理函数
  return () => {
    leftPane.contentWindow.removeEventListener('scroll', leftScrollHandler);
    rightPane.contentWindow.removeEventListener('scroll', rightScrollHandler);
  };
}

// 保存窗格比例
function savePaneRatio(ratio) {
  console.log('Saving pane ratio:', ratio);
  chrome.storage.local.get(['splitViewStates'], (result) => {
    const states = result.splitViewStates || {};
    const hostname = window.location.hostname;
    
    if (!states[hostname]) {
      states[hostname] = {};
    }
    
    states[hostname].paneRatio = ratio;
    console.log('Saving states:', states);
    chrome.storage.local.set({ splitViewStates: states }, () => {
      console.log('Pane ratio saved successfully');
    });
  });
}

// 恢复窗格比例
function restorePaneRatio() {
  console.log('Restoring pane ratio...');
  chrome.storage.local.get(['splitViewStates'], (result) => {
    const states = result.splitViewStates || {};
    const hostname = window.location.hostname;
    
    console.log('Retrieved states:', states);
    
    if (states[hostname] && states[hostname].paneRatio) {
      const container = document.getElementById(splitViewContainerId);
      const leftPane = container.querySelector('#left-pane');
      const rightPane = container.querySelector('#right-pane');
      const divider = container.querySelector('#split-view-divider');
      
      if (container && leftPane && rightPane && divider) {
        const containerWidth = container.offsetWidth;
        const ratio = states[hostname].paneRatio;
        const leftWidth = containerWidth * ratio;
        const rightWidth = containerWidth - leftWidth - 10; // 10px 为分割线宽度
        
        console.log('Restoring widths:', {
          containerWidth,
          ratio,
          leftWidth,
          rightWidth
        });
        
        leftPane.style.width = `${leftWidth}px`;
        rightPane.style.width = `${rightWidth}px`;
        console.log('Pane widths restored');
      } else {
        console.log('Required elements not found:', {
          container: !!container,
          leftPane: !!leftPane,
          rightPane: !!rightPane,
          divider: !!divider
        });
      }
    } else {
      console.log('No saved ratio found for hostname:', hostname);
    }
  });
}

// 移除分屏视图
function removeSplitView() {
  if (!window.splitViewState.isActive) return;
  
  const container = document.getElementById(splitViewContainerId);
  if (container) {
    container.remove();
  }
  
  document.documentElement.style.overflow = '';
  window.splitViewState.isActive = false;
}

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  try {
    if (message.action === 'toggleSplitView') {
      // 检查是否是当前网站的消息
      if (message.hostname === window.location.hostname) {
        if (message.state) {
          createSplitView();
        } else {
          removeSplitView();
        }
      }
    }
  } catch (error) {
    console.error('Error handling message:', error);
    // 忽略扩展上下文失效的错误
    if (!error.message.includes('Extension context invalidated')) {
      console.error('Error handling message:', error);
    }
  }
});

// 页面加载时检查状态
chrome.storage.local.get(['splitViewStates'], (result) => {
  const states = result.splitViewStates || {};
  if (states[window.location.hostname]) {
    createSplitView();
  }
});

// 加载保存的滚动位置
chrome.storage.local.get(['scrollPosition'], (result) => {
  if (result.scrollPosition && window.splitViewState.isActive) {
    const container = document.getElementById(splitViewContainerId);
    if (container) {
      const leftPane = container.querySelector('#left-pane');
      const rightPane = container.querySelector('#right-pane');
      
      if (leftPane && rightPane) {
        leftPane.contentWindow.scrollTo(result.scrollPosition.x, result.scrollPosition.y);
        rightPane.contentWindow.scrollTo(result.scrollPosition.x, result.scrollPosition.y);
      }
    }
  }
});

console.log('Content script loaded successfully');
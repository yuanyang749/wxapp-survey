/**
 * 加载状态管理工具
 * 统一管理页面加载状态和用户反馈
 */

class LoadingManager {
  constructor() {
    this.loadingStates = new Map()
    this.loadingQueue = new Set()
  }

  /**
   * 显示加载状态
   * @param {string} key 加载状态的唯一标识
   * @param {object} options 加载选项
   */
  showLoading(key = 'default', options = {}) {
    const {
      title = '加载中...',
      mask = true,
      duration = 0,
      showToast = true
    } = options

    // 记录加载状态
    this.loadingStates.set(key, {
      title,
      startTime: Date.now(),
      options
    })

    this.loadingQueue.add(key)

    // 显示加载提示
    if (showToast) {
      wx.showLoading({
        title,
        mask
      })
    }

    // 自动隐藏（如果设置了duration）
    if (duration > 0) {
      setTimeout(() => {
        this.hideLoading(key)
      }, duration)
    }

    return key
  }

  /**
   * 隐藏加载状态
   * @param {string} key 加载状态的唯一标识
   */
  hideLoading(key = 'default') {
    if (!this.loadingStates.has(key)) {
      return
    }

    const loadingState = this.loadingStates.get(key)
    const duration = Date.now() - loadingState.startTime

    // 移除加载状态
    this.loadingStates.delete(key)
    this.loadingQueue.delete(key)

    // 如果没有其他加载状态，隐藏加载提示
    if (this.loadingQueue.size === 0) {
      wx.hideLoading()
    }

    // 记录加载时间（用于性能监控）
    console.log(`Loading completed: ${key}, duration: ${duration}ms`)

    return duration
  }

  /**
   * 显示成功提示
   * @param {string} message 成功消息
   * @param {object} options 选项
   */
  showSuccess(message, options = {}) {
    const {
      duration = 2000,
      mask = false
    } = options

    wx.showToast({
      title: message,
      icon: 'success',
      duration,
      mask
    })
  }

  /**
   * 显示错误提示
   * @param {string} message 错误消息
   * @param {object} options 选项
   */
  showError(message, options = {}) {
    const {
      duration = 3000,
      mask = false
    } = options

    wx.showToast({
      title: message,
      icon: 'none',
      duration,
      mask
    })
  }

  /**
   * 显示警告提示
   * @param {string} message 警告消息
   * @param {object} options 选项
   */
  showWarning(message, options = {}) {
    const {
      duration = 2500,
      mask = false,
      useCustomToast = false
    } = options

    if (useCustomToast) {
      // 使用自定义消息组件
      this.showCustomMessage(message, 'warning', { duration })
    } else {
      wx.showToast({
        title: message,
        icon: 'none',
        duration,
        mask
      })
    }
  }

  /**
   * 显示信息提示
   * @param {string} message 信息消息
   * @param {object} options 选项
   */
  showInfo(message, options = {}) {
    const {
      duration = 2000,
      useCustomToast = false
    } = options

    if (useCustomToast) {
      // 使用自定义消息组件
      this.showCustomMessage(message, 'info', { duration })
    } else {
      wx.showToast({
        title: message,
        icon: 'none',
        duration: duration,
        mask: false
      })
    }
  }

  /**
   * 显示自定义消息
   * @param {string} message 消息内容
   * @param {string} type 消息类型
   * @param {object} options 选项
   */
  showCustomMessage(message, type = 'info', options = {}) {
    // 这里需要页面实例来显示自定义消息组件
    // 实际使用时需要在页面中集成消息组件
    console.log(`Custom message: [${type}] ${message}`, options)

    // 触发全局事件，让页面监听并显示消息
    if (getApp().globalData.eventBus) {
      getApp().globalData.eventBus.emit('showMessage', {
        message,
        type,
        ...options
      })
    }
  }

  /**
   * 显示确认对话框
   * @param {string} title 标题
   * @param {string} content 内容
   * @param {object} options 选项
   */
  showConfirm(title, content, options = {}) {
    const {
      confirmText = '确定',
      cancelText = '取消',
      confirmColor = '#5f1971'
    } = options

    return new Promise((resolve) => {
      wx.showModal({
        title,
        content,
        confirmText,
        cancelText,
        confirmColor,
        success: (res) => {
          resolve(res.confirm)
        },
        fail: () => {
          resolve(false)
        }
      })
    })
  }

  /**
   * 显示操作菜单
   * @param {array} itemList 菜单项列表
   * @param {object} options 选项
   */
  showActionSheet(itemList, options = {}) {
    return new Promise((resolve, reject) => {
      wx.showActionSheet({
        itemList,
        ...options,
        success: (res) => {
          resolve(res.tapIndex)
        },
        fail: (error) => {
          reject(error)
        }
      })
    })
  }

  /**
   * 检查是否正在加载
   * @param {string} key 加载状态的唯一标识
   */
  isLoading(key = 'default') {
    return this.loadingStates.has(key)
  }

  /**
   * 获取所有加载状态
   */
  getAllLoadingStates() {
    return Array.from(this.loadingStates.entries())
  }

  /**
   * 清除所有加载状态
   */
  clearAllLoading() {
    this.loadingStates.clear()
    this.loadingQueue.clear()
    wx.hideLoading()
  }

  /**
   * 页面性能监控
   * @param {string} pageName 页面名称
   * @param {function} loadFunction 加载函数
   */
  async monitorPageLoad(pageName, loadFunction) {
    const startTime = Date.now()
    const loadingKey = `page-${pageName}`
    
    this.showLoading(loadingKey, {
      title: '页面加载中...',
      showToast: false // 页面级加载不显示toast
    })

    try {
      const result = await loadFunction()
      const duration = this.hideLoading(loadingKey)
      
      // 记录页面加载性能
      console.log(`Page load performance: ${pageName}, ${duration}ms`)
      
      // 如果加载时间过长，可以考虑优化提示
      if (duration > 3000) {
        console.warn(`Slow page load detected: ${pageName}, ${duration}ms`)
      }
      
      return result
    } catch (error) {
      this.hideLoading(loadingKey)
      throw error
    }
  }
}

// 创建单例实例
const loadingManager = new LoadingManager()

module.exports = loadingManager

/**
 * 全局事件总线
 * 用于组件间通信和全局状态管理
 */

class EventBus {
  constructor() {
    this.events = new Map()
  }

  /**
   * 监听事件
   * @param {string} eventName 事件名称
   * @param {function} callback 回调函数
   * @param {object} context 上下文对象
   */
  on(eventName, callback, context = null) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, [])
    }
    
    this.events.get(eventName).push({
      callback,
      context,
      once: false
    })
  }

  /**
   * 监听事件（只触发一次）
   * @param {string} eventName 事件名称
   * @param {function} callback 回调函数
   * @param {object} context 上下文对象
   */
  once(eventName, callback, context = null) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, [])
    }
    
    this.events.get(eventName).push({
      callback,
      context,
      once: true
    })
  }

  /**
   * 触发事件
   * @param {string} eventName 事件名称
   * @param {any} data 事件数据
   */
  emit(eventName, data = null) {
    if (!this.events.has(eventName)) {
      return
    }
    
    const listeners = this.events.get(eventName)
    const toRemove = []
    
    listeners.forEach((listener, index) => {
      try {
        if (listener.context) {
          listener.callback.call(listener.context, data)
        } else {
          listener.callback(data)
        }
        
        // 标记一次性监听器待移除
        if (listener.once) {
          toRemove.push(index)
        }
      } catch (error) {
        console.error(`Event callback error for ${eventName}:`, error)
      }
    })
    
    // 移除一次性监听器
    toRemove.reverse().forEach(index => {
      listeners.splice(index, 1)
    })
  }

  /**
   * 移除事件监听器
   * @param {string} eventName 事件名称
   * @param {function} callback 回调函数
   * @param {object} context 上下文对象
   */
  off(eventName, callback = null, context = null) {
    if (!this.events.has(eventName)) {
      return
    }
    
    const listeners = this.events.get(eventName)
    
    if (!callback) {
      // 移除所有监听器
      this.events.delete(eventName)
      return
    }
    
    // 移除特定监听器
    const filteredListeners = listeners.filter(listener => {
      if (callback && listener.callback !== callback) {
        return true
      }
      if (context && listener.context !== context) {
        return true
      }
      return false
    })
    
    if (filteredListeners.length === 0) {
      this.events.delete(eventName)
    } else {
      this.events.set(eventName, filteredListeners)
    }
  }

  /**
   * 移除所有事件监听器
   */
  clear() {
    this.events.clear()
  }

  /**
   * 获取事件监听器数量
   * @param {string} eventName 事件名称
   */
  listenerCount(eventName) {
    if (!this.events.has(eventName)) {
      return 0
    }
    return this.events.get(eventName).length
  }

  /**
   * 获取所有事件名称
   */
  eventNames() {
    return Array.from(this.events.keys())
  }

  /**
   * 检查是否有监听器
   * @param {string} eventName 事件名称
   */
  hasListeners(eventName) {
    return this.events.has(eventName) && this.events.get(eventName).length > 0
  }
}

// 创建全局实例
const eventBus = new EventBus()

module.exports = eventBus

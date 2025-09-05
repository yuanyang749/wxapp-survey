/**
 * 导航助手
 * 处理页面导航和权限检查
 */

import { APP_CONFIG, PageAccessHelper, ERROR_MESSAGES } from '../config/app.js'
import hybridAuthService from '../services/HybridAuthService.js'

class NavigationHelper {
  
  /**
   * 安全导航到指定页面
   * 自动检查权限并处理授权引导
   * @param {string} url 目标页面URL
   * @param {object} options 导航选项
   * @returns {Promise<boolean>} 是否成功导航
   */
  static async navigateTo(url, options = {}) {
    const {
      showAuthPrompt = true,
      authPromptMessage = '此功能需要授权后使用'
    } = options

    try {
      // 提取页面路径
      const pagePath = this.extractPagePath(url)

      // 检查页面是否需要授权
      if (PageAccessHelper.requiresAuth(pagePath)) {
        const isAuthenticated = hybridAuthService.isUserAuthenticated()

        if (!isAuthenticated) {
          if (showAuthPrompt) {
            const authorized = await this.showAuthPrompt(authPromptMessage)
            if (!authorized) {
              return false
            }
          } else {
            return false
          }
        }
      }

      // 执行导航
      wx.navigateTo({
        url: url,
        success: () => {
          console.log('Navigate to:', url)
        },
        fail: (error) => {
          console.error('Navigation failed:', error)
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          })
        }
      })

      return true

    } catch (error) {
      console.error('Safe navigation error:', error)
      return false
    }
  }
  
  /**
   * 重定向到指定页面
   * @param {string} url 目标页面URL
   * @param {object} options 重定向选项
   * @returns {Promise<boolean>} 是否成功重定向
   */
  static async redirectTo(url, options = {}) {
    const {
      showAuthPrompt = true,
      authPromptMessage = '此功能需要授权后使用'
    } = options

    try {
      const pagePath = this.extractPagePath(url)

      if (PageAccessHelper.requiresAuth(pagePath)) {
        const isAuthenticated = hybridAuthService.isUserAuthenticated()

        if (!isAuthenticated) {
          if (showAuthPrompt) {
            const authorized = await this.showAuthPrompt(authPromptMessage)
            if (!authorized) {
              return false
            }
          } else {
            return false
          }
        }
      }

      wx.redirectTo({
        url: url,
        success: () => {
          console.log('Redirect to:', url)
        },
        fail: (error) => {
          console.error('Redirect failed:', error)
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          })
        }
      })

      return true

    } catch (error) {
      console.error('Safe redirect error:', error)
      return false
    }
  }
  
  /**
   * 切换到 Tab 页面
   * @param {string} url Tab页面URL
   * @returns {boolean} 是否成功切换
   */
  static switchTab(url) {
    try {
      wx.switchTab({
        url: url,
        success: () => {
          console.log('Switch tab to:', url)
        },
        fail: (error) => {
          console.error('Switch tab failed:', error)
          wx.showToast({
            title: '页面切换失败',
            icon: 'none'
          })
        }
      })
      
      return true
      
    } catch (error) {
      console.error('Switch tab error:', error)
      return false
    }
  }
  
  /**
   * 返回上一页
   * @param {number} delta 返回层数
   */
  static navigateBack(delta = 1) {
    try {
      // 获取当前页面栈
      const pages = getCurrentPages()

      // 如果页面栈长度小于等于1，说明是首页或只有一个页面，无法返回
      if (pages.length <= 1) {
        console.warn('Cannot navigate back: already at the first page')
        return
      }

      wx.navigateBack({
        delta: delta,
        fail: (error) => {
          console.error('Navigate back failed:', error)
          // 如果返回失败，尝试跳转到首页
          this.switchTab('/pages/main/index')
        }
      })
    } catch (error) {
      console.error('Navigate back error:', error)
    }
  }
  
  /**
   * 显示授权引导
   * @param {string} message 提示消息
   * @returns {Promise<boolean>} 用户是否完成授权
   */
  static async showAuthPrompt(message = '此功能需要授权后使用') {
    return new Promise((resolve) => {
      wx.showModal({
        title: '需要授权',
        content: message,
        confirmText: '立即授权',
        cancelText: '暂不授权',
        success: async (res) => {
          if (res.confirm) {
            // 用户选择授权
            const result = await this.handleAuthorization()
            resolve(result.success)
          } else {
            resolve(false)
          }
        },
        fail: () => {
          resolve(false)
        }
      })
    })
  }

  /**
   * 处理用户授权
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  static async handleAuthorization() {
    try {
      wx.showLoading({
        title: '授权中...',
        mask: true
      })

      const result = await hybridAuthService.requestWxAuthorization()

      wx.hideLoading()

      if (result.success) {
        wx.showToast({
          title: '授权成功',
          icon: 'success'
        })

        return { success: true, error: null }
      } else {
        wx.showToast({
          title: result.error || '授权失败',
          icon: 'none'
        })

        return { success: false, error: result.error }
      }

    } catch (error) {
      wx.hideLoading()
      console.error('Handle authorization error:', error)

      wx.showToast({
        title: '授权失败',
        icon: 'none'
      })

      return { success: false, error: '授权失败' }
    }
  }
  
  /**
   * 检查当前页面权限
   * @param {string} pagePath 页面路径
   * @returns {boolean} 是否有权限访问
   */
  static checkPageAccess(pagePath) {
    if (PageAccessHelper.allowsAnonymous(pagePath)) {
      return true
    }
    
    if (PageAccessHelper.requiresAuth(pagePath)) {
      return hybridAuthService.isUserAuthenticated()
    }
    
    return true
  }
  
  /**
   * 从URL中提取页面路径
   * @private
   * @param {string} url 完整URL
   * @returns {string} 页面路径
   */
  static extractPagePath(url) {
    // 移除查询参数
    const pathWithoutQuery = url.split('?')[0]
    
    // 移除开头的斜杠
    return pathWithoutQuery.startsWith('/') 
      ? pathWithoutQuery.substring(1) 
      : pathWithoutQuery
  }
  
  /**
   * 构建带参数的URL
   * @param {string} basePath 基础路径
   * @param {object} params 参数对象
   * @returns {string} 完整URL
   */
  static buildUrl(basePath, params = {}) {
    if (Object.keys(params).length === 0) {
      return basePath
    }
    
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')
    
    return `${basePath}?${queryString}`
  }
  
  /**
   * 解析URL参数
   * @param {string} url 完整URL
   * @returns {object} 参数对象
   */
  static parseUrlParams(url) {
    const params = {}
    const queryString = url.split('?')[1]
    
    if (!queryString) return params
    
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=')
      if (key && value) {
        params[key] = decodeURIComponent(value)
      }
    })
    
    return params
  }
}

module.exports = NavigationHelper

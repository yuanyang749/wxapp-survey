/**
 * Supabase 客户端配置
 * 使用官方@supabase/supabase-js npm包
 */

// 引入微信小程序优化的Supabase客户端
const { createClient } = require('supabase-wechat-stable-v2')
const { APP_CONFIG } = require('./app.js')

/**
 * 创建 Supabase 客户端实例
 * 使用 supabase-wechat-stable-v2 包，专门为微信小程序环境优化
 */
const supabase = createClient(
  APP_CONFIG.SUPABASE_URL,
  APP_CONFIG.SUPABASE_ANON_KEY,
  {
    auth: {
      // 微信小程序环境配置
      storage: {
        getItem: (key) => {
          return wx.getStorageSync(key) || null
        },
        setItem: (key, value) => {
          wx.setStorageSync(key, value)
        },
        removeItem: (key) => {
          wx.removeStorageSync(key)
        }
      },
      // 禁用自动刷新，由应用手动管理
      autoRefreshToken: false,
      // 持久化会话
      persistSession: true,
      // 检测会话变化
      detectSessionInUrl: false
    },

    // 全局配置
    global: {
      headers: {
        'X-Client-Info': 'wxapp-survey-2025'
      }
    }
  }
)

/**
 * Supabase 工具函数
 */
const SupabaseHelper = {
  /**
   * 检查 Supabase 连接状态
   * @returns {Promise<boolean>} 连接是否正常
   */
  async checkConnection() {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('id')
        .limit(1)

      return !error
    } catch (err) {
      console.error('Supabase connection check failed:', err)
      return false
    }
  },
  
  /**
   * 获取当前用户会话
   * @returns {Promise<{session: object|null, user: object|null}>}
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Get session error:', error)
        return { session: null, user: null }
      }

      return {
        session,
        user: session?.user || null
      }
    } catch (err) {
      console.error('Get session failed:', err)
      return { session: null, user: null }
    }
  },
  
  /**
   * 刷新用户会话
   * 简化版本：重新获取本地存储的用户信息
   * @returns {Promise<{session: object|null, user: object|null}>}
   */
  async refreshSession() {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error('Refresh session error:', error)
        return { session: null, user: null }
      }

      return {
        session,
        user: session?.user || null
      }
    } catch (err) {
      console.error('Refresh session failed:', err)
      return { session: null, user: null }
    }
  },
  
  /**
   * 清除用户会话
   * 简化版本：清除本地存储的用户信息
   * @returns {Promise<boolean>} 是否成功清除
   */
  async clearSession() {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Sign out error:', error)
        return false
      }

      return true
    } catch (err) {
      console.error('Sign out failed:', err)
      return false
    }
  },
  
  /**
   * 处理 Supabase 错误
   * @param {object} error Supabase 错误对象
   * @returns {string} 用户友好的错误消息
   */
  handleError(error) {
    if (!error) return ''
    
    // 根据错误代码返回相应的中文消息
    const errorMap = {
      'PGRST116': '记录不存在',
      'PGRST301': '权限不足',
      '23505': '数据已存在',
      '23503': '关联数据不存在',
      '42501': '权限不足',
      'auth/invalid-jwt': '登录已过期，请重新登录',
      'auth/user-not-found': '用户不存在'
    }
    
    // 检查错误代码
    if (error.code && errorMap[error.code]) {
      return errorMap[error.code]
    }
    
    // 检查错误消息中的关键词
    const message = error.message || error.toString()
    
    if (message.includes('JWT')) {
      return '登录已过期，请重新登录'
    }
    
    if (message.includes('permission')) {
      return '权限不足'
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return '网络连接失败，请检查网络设置'
    }
    
    // 返回原始错误消息（开发环境）或通用错误消息（生产环境）
    // 在微信小程序中，通过 wx.getSystemInfoSync() 判断是否为开发环境
    const isDev = (() => {
      try {
        const systemInfo = wx.getSystemInfoSync()
        return systemInfo.platform === 'devtools'
      } catch (e) {
        return false
      }
    })()

    return isDev ? message : '操作失败，请稍后重试'
  }
}

// 导出模块
module.exports = {
  supabase,
  SupabaseHelper
}

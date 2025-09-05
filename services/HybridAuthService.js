/**
 * 混合认证服务
 * 支持微信登录和匿名访问的统一认证管理
 */

const { supabase, SupabaseHelper } = require('../config/supabase.js')
const { APP_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../config/app.js')

class HybridAuthService {
  constructor() {
    this.currentUser = null
    this.isAuthenticated = false
    this.isInitialized = false
    
    // 用户状态变化监听器
    this.userStateListeners = []
  }
  
  /**
   * 初始化认证服务
   * 自动检查微信授权状态并尝试静默登录
   */
  async initialize() {
    if (this.isInitialized) return

    try {
      // 检查 Supabase 连接
      const isConnected = await SupabaseHelper.checkConnection()
      if (!isConnected) {
        console.warn('Supabase connection failed, running in offline mode')
      }

      // 尝试恢复用户会话
      const { session, user } = await SupabaseHelper.getCurrentSession()

      if (session && user) {
        this.currentUser = user
        this.isAuthenticated = true

        // 获取用户详细信息
        await this.loadUserProfile()

        console.log('User session restored:', user.id)
      } else {
        // 尝试微信静默登录
        await this.attemptSilentWxAuth()
      }

      this.isInitialized = true
      this.notifyUserStateChange()

    } catch (error) {
      console.error('Auth service initialization failed:', error)
      this.isInitialized = true
    }
  }

  /**
   * 尝试微信静默登录
   * 如果用户之前已授权，自动恢复登录状态
   */
  async attemptSilentWxAuth() {
    try {
      // 获取微信登录凭证
      const wxLoginResult = await this.getWxLoginCode()
      if (!wxLoginResult.success) {
        console.log('Silent wx auth failed: no login code')
        return
      }

      // 尝试使用 code 进行静默认证
      const { data, error } = await supabase.functions.invoke('wechat-auth', {
        body: {
          code: wxLoginResult.code,
          appId: APP_CONFIG.APP_ID,
          silentMode: true // 标识为静默模式
        }
      })

      if (!error && data.session) {
        await supabase.auth.setSession(data.session)
        this.currentUser = data.user
        this.isAuthenticated = true

        // 加载用户详细信息
        await this.loadUserProfile()

        console.log('Silent wx auth success:', data.user.id)
      } else {
        console.log('Silent wx auth failed, user needs to authorize')
      }

    } catch (error) {
      console.log('Silent wx auth error:', error)
    }
  }
  
  /**
   * 微信用户授权
   * 用户主动触发授权，获取用户信息并完成认证
   * @returns {Promise<{success: boolean, user: object|null, error: string|null}>}
   */
  async requestWxAuthorization() {
    try {
      // 1. 获取微信登录凭证
      const wxLoginResult = await this.getWxLoginCode()
      if (!wxLoginResult.success) {
        return { success: false, user: null, error: wxLoginResult.error }
      }

      // 2. 获取微信用户信息（需要用户授权）
      const wxUserInfo = await this.getWxUserInfo()
      if (!wxUserInfo.success) {
        return { success: false, user: null, error: wxUserInfo.error }
      }

      // 3. 调用微信认证 Edge Function
      const { data, error } = await supabase.functions.invoke('wechat-auth', {
        body: {
          code: wxLoginResult.code,
          userInfo: wxUserInfo.userInfo,
          appId: APP_CONFIG.APP_ID,
          silentMode: false
        }
      })

      if (error) {
        console.error('WeChat auth failed:', error)
        return {
          success: false,
          user: null,
          error: SupabaseHelper.handleError(error)
        }
      }

      // 4. 设置用户会话
      if (data.session) {
        await supabase.auth.setSession(data.session)
        this.currentUser = data.user
        this.isAuthenticated = true

        // 加载用户详细信息
        await this.loadUserProfile()

        this.notifyUserStateChange()

        return {
          success: true,
          user: this.currentUser,
          error: null
        }
      }

      return {
        success: false,
        user: null,
        error: '授权失败，请重试'
      }

    } catch (error) {
      console.error('WeChat authorization error:', error)
      return {
        success: false,
        user: null,
        error: '授权失败，请重试'
      }
    }
  }
  
  /**
   * 检查用户是否需要授权
   * @returns {boolean} 是否需要授权
   */
  needsAuthorization() {
    return !this.isAuthenticated
  }

  /**
   * 获取授权状态描述
   * @returns {string} 授权状态描述
   */
  getAuthStatusText() {
    if (this.isAuthenticated) {
      return '已授权'
    }
    return '未授权'
  }
  
  /**
   * 获取当前用户
   * @returns {object|null} 当前用户信息
   */
  getCurrentUser() {
    return this.currentUser
  }
  
  /**
   * 检查用户是否已登录
   * @returns {boolean} 是否已登录
   */
  isUserAuthenticated() {
    return this.isAuthenticated && this.currentUser !== null
  }
  
  /**
   * 检查用户权限
   * @param {string} permission 权限名称
   * @returns {boolean} 是否有权限
   */
  hasPermission(permission) {
    if (!this.isAuthenticated) return false
    
    // 基础权限检查逻辑
    switch (permission) {
      case 'create_survey':
      case 'manage_own_surveys':
      case 'participate_in_surveys':
        return true
      
      case 'manage_all_surveys':
        return this.currentUser?.role === 'admin'
      
      default:
        return false
    }
  }
  
  /**
   * 添加用户状态变化监听器
   * @param {function} listener 监听器函数
   */
  addUserStateListener(listener) {
    this.userStateListeners.push(listener)
  }
  
  /**
   * 移除用户状态变化监听器
   * @param {function} listener 监听器函数
   */
  removeUserStateListener(listener) {
    const index = this.userStateListeners.indexOf(listener)
    if (index > -1) {
      this.userStateListeners.splice(index, 1)
    }
  }
  
  /**
   * 通知用户状态变化
   * @private
   */
  notifyUserStateChange() {
    const userState = {
      user: this.currentUser,
      isAuthenticated: this.isAuthenticated
    }
    
    this.userStateListeners.forEach(listener => {
      try {
        listener(userState)
      } catch (error) {
        console.error('User state listener error:', error)
      }
    })
  }
  
  /**
   * 获取微信登录凭证
   * @private
   * @returns {Promise<{success: boolean, code: string|null, error: string|null}>}
   */
  async getWxLoginCode() {
    return new Promise((resolve) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve({ success: true, code: res.code, error: null })
          } else {
            resolve({ success: false, code: null, error: '获取登录凭证失败' })
          }
        },
        fail: (error) => {
          resolve({ success: false, code: null, error: '微信登录失败' })
        }
      })
    })
  }
  
  /**
   * 获取微信用户信息
   * @private
   * @returns {Promise<{success: boolean, userInfo: object|null, error: string|null}>}
   */
  async getWxUserInfo() {
    return new Promise((resolve) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          resolve({ success: true, userInfo: res.userInfo, error: null })
        },
        fail: (error) => {
          resolve({ success: false, userInfo: null, error: '获取用户信息失败' })
        }
      })
    })
  }
  
  /**
   * 加载用户详细信息
   * @private
   */
  async loadUserProfile() {
    if (!this.currentUser?.id) return
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.currentUser.id)
        .single()
      
      if (!error && data) {
        // 合并用户信息
        this.currentUser = {
          ...this.currentUser,
          profile: data
        }
      }
    } catch (error) {
      console.error('Load user profile failed:', error)
    }
  }
}

// 创建单例实例
const hybridAuthService = new HybridAuthService()

module.exports = hybridAuthService

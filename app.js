/**
 * 微信小程序主应用
 * 集成 Supabase 和混合认证服务
 */

const hybridAuthService = require('./services/HybridAuthService.js')
const eventBus = require('./utils/EventBus.js')
const { APP_CONFIG } = require('./config/app.js')

App({
  globalData: {
    // 用户信息（兼容旧版本）
    userInfo: null,
    userId: null,

    // 应用配置
    appConfig: APP_CONFIG,

    // 认证服务
    authService: hybridAuthService,

    // 全局事件总线
    eventBus: eventBus
  },

  /**
   * 小程序启动
   */
  async onLaunch(options) {
    console.log('App Launch:', options)

    try {
      // 初始化认证服务
      await hybridAuthService.initialize()

      // 更新全局用户信息（兼容旧版本）
      this.updateGlobalUserInfo()

      // 监听用户状态变化
      hybridAuthService.addUserStateListener(this.onUserStateChange.bind(this))

      console.log('App initialized successfully')

    } catch (error) {
      console.error('App initialization failed:', error)
    }
  },

  /**
   * 小程序显示
   */
  onShow(options) {
    console.log('App Show:', options)

    // 检查用户状态
    this.updateGlobalUserInfo()
  },

  /**
   * 小程序隐藏
   */
  onHide() {
    console.log('App Hide')
  },

  /**
   * 用户状态变化处理
   */
  onUserStateChange(userState) {
    console.log('User state changed:', userState)
    this.updateGlobalUserInfo()
  },

  /**
   * 更新全局用户信息
   * 保持与旧版本的兼容性
   */
  updateGlobalUserInfo() {
    const user = hybridAuthService.getCurrentUser()

    if (user) {
      this.globalData.userInfo = {
        id: user.id,
        nickName: user.profile?.nickname || '用户',
        avatarUrl: user.profile?.avatar_url || '/images/youke.png',
        ...user.profile
      }
      this.globalData.userId = user.id
    } else {
      this.globalData.userInfo = null
      this.globalData.userId = null
    }
  },

  /**
   * 获取用户信息（兼容旧版本）
   */
  getUserInfo() {
    return this.globalData.userInfo
  },

  /**
   * 获取用户ID（兼容旧版本）
   */
  getUserId() {
    return this.globalData.userId
  },

  /**
   * 检查用户是否已授权
   */
  isUserAuthorized() {
    return hybridAuthService.isUserAuthenticated()
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    wx.stopPullDownRefresh()
  },

  /**
   * 错误处理
   */
  onError(error) {
    console.error('App Error:', error)

    // 可以在这里添加错误上报逻辑
    // 例如上报到 Supabase 或其他错误监控服务
  },

  /**
   * 页面未找到
   */
  onPageNotFound(res) {
    console.error('Page not found:', res)

    // 重定向到首页
    wx.redirectTo({
      url: '/pages/main/index'
    })
  }
})
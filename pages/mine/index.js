/**
 * 个人中心页面
 * 显示用户信息和投票统计
 */

import hybridAuthService from '../../services/HybridAuthService.js'
import surveyService from '../../services/SurveyService.js'
import NavigationHelper from '../../utils/NavigationHelper.js'
import { APP_CONFIG } from '../../config/app.js'

Page({
  data: {
    // 用户信息
    user: null,
    isAuthenticated: false,

    // 统计数据
    surveyStats: {
      totalSurveys: 0,
      activeSurveys: 0,
      totalVotes: 0,
      totalParticipants: 0
    },

    // UI状态
    loading: true,
    show: false
  },

  /**
   * 页面加载
   */
  async onLoad() {
    // 初始化认证服务
    await hybridAuthService.initialize()
    this.updateUserState()

    // 如果未授权，引导授权
    if (!this.data.isAuthenticated) {
      const authorized = await NavigationHelper.showAuthPrompt('查看个人中心需要先授权')
      if (!authorized) {
        NavigationHelper.switchTab('/pages/main/index')
        return
      }
      this.updateUserState()
    }

    // 加载数据
    await this.loadUserData()
  },

  /**
   * 页面显示
   */
  async onShow() {
    this.updateUserState()

    // 如果已授权，刷新数据
    if (this.data.isAuthenticated) {
      await this.loadUserData()
    }
  },

  /**
   * 更新用户状态
   */
  updateUserState() {
    const user = hybridAuthService.getCurrentUser()
    const isAuthenticated = hybridAuthService.isUserAuthenticated()

    this.setData({
      user: user,
      isAuthenticated: isAuthenticated
    })
  },

  /**
   * 加载用户数据
   */
  async loadUserData() {
    if (!this.data.isAuthenticated) return

    this.setData({ loading: true })

    try {
      // 加载用户投票统计
      await this.loadSurveyStats()

    } catch (error) {
      console.error('Load user data failed:', error)
    } finally {
      this.setData({
        loading: false,
        show: true
      })
    }
  },

  /**
   * 加载投票统计数据
   */
  async loadSurveyStats() {
    try {
      const { data, error } = await surveyService.getUserSurveys({
        page: 1,
        limit: 1000 // 获取所有投票用于统计
      })

      if (error) {
        console.error('Load survey stats failed:', error)
        return
      }

      // 计算统计数据
      const surveys = data || []
      const activeSurveys = surveys.filter(s => s.status === 'active')
      const totalVotes = surveys.reduce((sum, s) => sum + (s.total_votes || 0), 0)
      const totalParticipants = surveys.reduce((sum, s) => sum + (s.total_participants || 0), 0)

      this.setData({
        surveyStats: {
          totalSurveys: surveys.length,
          activeSurveys: activeSurveys.length,
          totalVotes: totalVotes,
          totalParticipants: totalParticipants
        }
      })

    } catch (error) {
      console.error('Load survey stats failed:', error)
    }
  },

  /**
   * 导航到我的投票页面
   */
  async navigateToMySurveys() {
    // 暂时禁用，等待Supabase版本实现
    wx.showToast({
      title: '功能开发中，敬请期待',
      icon: 'none',
      duration: 2000
    })
    // await NavigationHelper.navigateTo('/pages/mySurvey/index')
  },

  /**
   * 导航到参与记录页面
   */
  async navigateToParticipation() {
    // 暂时禁用，等待Supabase版本实现
    wx.showToast({
      title: '功能开发中，敬请期待',
      icon: 'none',
      duration: 2000
    })
    // await NavigationHelper.navigateTo('/pages/participate/index')
  },

  /**
   * 导航到创建投票页面
   */
  async navigateToCreate() {
    await NavigationHelper.navigateTo('/pages/index/index')
  },

  /**
   * 导航到关于页面
   */
  async navigateToAbout() {
    await NavigationHelper.navigateTo('/pages/about/index')
  },

  /**
   * 授权按钮点击
   */
  async onAuthorizeTap() {
    const result = await NavigationHelper.handleAuthorization()

    if (result.success) {
      // 授权成功后重新加载数据
      this.updateUserState()
      await this.loadUserData()
    }
  },

  /**
   * 分享功能
   */
  onShareAppMessage() {
    const { user } = this.data
    const nickName = user?.profile?.nickname || '朋友'

    return {
      title: `${nickName}邀请您使用投票小程序`,
      path: '/pages/main/index',
      success: (res) => {
        console.log('Share success:', res)
      },
      fail: (res) => {
        console.log('Share failed:', res)
      }
    }
  }
})
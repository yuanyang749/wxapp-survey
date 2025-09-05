/**
 * 主页 - 支持混合访问模式
 * 匿名用户可以浏览公开投票，登录用户可以看到更多内容
 */

const hybridAuthService = require('../../services/HybridAuthService.js')
const surveyService = require('../../services/SurveyService.js')
const NavigationHelper = require('../../utils/NavigationHelper.js')
const LoadingManager = require('../../utils/LoadingManager.js')
const { APP_CONFIG, ERROR_MESSAGES } = require('../../config/app.js')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 用户状态
    user: null,
    isAuthenticated: false,

    // 页面状态
    loading: true,
    refreshing: false,
    loadingMore: false,

    // 投票列表
    surveys: [],
    currentPage: 1,
    hasMore: true,

    // 筛选和排序
    activeTab: 'new', // 'new' | 'hot'
    searchKeyword: '',

    // UI状态
    typeNameFixed: false,
    scrollTop: 0,

    // 轮播图
    bannerUrls: [],
    bannerTxt: [],
    indicatorDots: false,
    autoplay: true,
    interval: 5000,
    duration: 1000
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    // 初始化认证服务
    await hybridAuthService.initialize()

    // 监听用户状态变化
    hybridAuthService.addUserStateListener(this.onUserStateChange.bind(this))

    // 设置初始用户状态
    this.updateUserState()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  async onShow() {
    // 刷新用户状态
    this.updateUserState()

    // 加载页面数据
    await this.loadPageData()
  },
  /**
   * 加载页面数据
   */
  async loadPageData() {
    try {
      // 使用LoadingManager监控页面加载性能
      await LoadingManager.monitorPageLoad('main', async () => {
        this.setData({
          loading: true,
          loadStartTime: Date.now()
        })

        // 并行加载轮播图和投票列表
        await Promise.all([
          this.loadBanners(),
          this.loadSurveys(true) // 重置列表
        ])

        // 添加最小加载时间，确保骨架屏有足够的展示时间
        await this.ensureMinimumLoadingTime(800)

        this.setData({ loading: false })
      })

    } catch (error) {
      console.error('Load page data failed:', error)
      LoadingManager.showError('页面加载失败，请重试')
      this.setData({ loading: false })
    }
  },

  /**
   * 确保最小加载时间
   * 避免骨架屏闪烁，提供更好的用户体验
   */
  async ensureMinimumLoadingTime(minTime = 500) {
    const loadStartTime = this.data.loadStartTime || Date.now()
    const elapsed = Date.now() - loadStartTime

    if (elapsed < minTime) {
      await new Promise(resolve => setTimeout(resolve, minTime - elapsed))
    }
  },

  /**
   * 加载轮播图
   */
  async loadBanners() {
    // 暂时使用静态数据，后续可以从数据库加载
    const banners = [
      {
        url: '/images/banner1.jpg',
        text: '欢迎使用投票小程序'
      },
      {
        url: '/images/banner2.jpg',
        text: '创建你的第一个投票'
      }
    ]

    this.setData({
      bannerUrls: banners.map(b => b.url),
      bannerTxt: banners.map(b => b.text)
    })
  },
  /**
   * 加载投票列表
   * @param {boolean} reset 是否重置列表
   */
  async loadSurveys(reset = false) {
    if (reset) {
      this.setData({
        currentPage: 1,
        surveys: [],
        hasMore: true
      })
    }

    if (!this.data.hasMore && !reset) {
      return
    }

    const { currentPage, activeTab, searchKeyword } = this.data

    try {
      // 根据当前标签确定排序方式
      const orderBy = activeTab === 'new' ? 'created_at' : 'total_votes'

      const { data, error, hasMore } = await surveyService.getPublicSurveys({
        page: currentPage,
        limit: APP_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
        orderBy: orderBy,
        orderDirection: 'desc',
        searchKeyword: searchKeyword
      })

      if (error) {
        wx.showToast({
          title: error,
          icon: 'none'
        })
        return
      }

      // 更新数据
      const newSurveys = reset ? data : [...this.data.surveys, ...data]

      this.setData({
        surveys: newSurveys,
        currentPage: reset ? 2 : currentPage + 1,
        hasMore: hasMore,
        refreshing: false,
        loadingMore: false
      })

    } catch (error) {
      console.error('Load surveys failed:', error)
      wx.showToast({
        title: ERROR_MESSAGES.NETWORK.CONNECTION_ERROR,
        icon: 'none'
      })
    }
  },
  /**
   * 用户状态变化处理
   */
  onUserStateChange(userState) {
    this.setData({
      user: userState.user,
      isAuthenticated: userState.isAuthenticated
    })

    // 用户状态变化时重新加载投票列表
    this.loadSurveys(true)
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
   * 标签切换
   */
  async onTabChange(e) {
    const typeName = e.currentTarget.dataset.typeName

    if (typeName === this.data.activeTab) {
      return
    }

    this.setData({ activeTab: typeName })

    // 重新加载投票列表
    await this.loadSurveys(true)
  },
  /**
   * 投票卡片点击
   */
  async onSurveyTap(e) {
    const survey = e.currentTarget.dataset.survey

    if (!survey || !survey.id) {
      return
    }

    // 检查访问权限并导航
    const url = `/pages/result/index?surveyId=${survey.id}`
    await NavigationHelper.navigateTo(url, {
      showAuthPrompt: survey.access_level === 'authenticated',
      authPromptMessage: '查看此投票需要授权'
    })
  },

  /**
   * 授权按钮点击
   */
  async onAuthorizeTap() {
    const result = await NavigationHelper.handleAuthorization()

    if (result.success) {
      // 授权成功后重新加载数据
      await this.loadPageData()
    }
  },

  /**
   * 滚动事件处理
   */
  onScroll(e) {
    const scrollTop = e.detail.scrollTop
    const typeNameFixed = scrollTop >= 150

    this.setData({
      typeNameFixed,
      scrollTop
    })
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    this.setData({ refreshing: true })

    try {
      await this.loadPageData()
    } finally {
      wx.stopPullDownRefresh()
      this.setData({ refreshing: false })
    }
  },

  /**
   * 上拉加载更多
   */
  async onReachBottom() {
    if (this.data.loadingMore || !this.data.hasMore) {
      return
    }

    this.setData({ loadingMore: true })
    await this.loadSurveys(false)
  },

  /**
   * 导航到创建投票页面
   */
  async navigateToCreate() {
    await NavigationHelper.navigateTo('/pages/index/index', {
      showAuthPrompt: true,
      authPromptMessage: '创建投票需要先授权'
    })
  },

  /**
   * 空状态按钮点击处理
   */
  async onEmptyButtonTap() {
    if (this.data.isAuthenticated) {
      // 已授权用户，导航到创建页面
      await this.navigateToCreate()
    } else {
      // 未授权用户，进行授权
      const result = await NavigationHelper.handleAuthorization()
      if (result.success) {
        // 授权成功后刷新页面数据
        this.updateUserState()
        await this.loadPageData()
      }
    }
  },

  /**
   * 分享功能
   */
  onShareAppMessage() {
    const { user } = this.data
    const nickName = user?.profile?.nickname || '朋友'

    return {
      title: `${nickName}邀请您参与投票`,
      path: '/pages/main/index',
      success: (res) => {
        console.log('Share success:', res)
      },
      fail: (res) => {
        console.log('Share failed:', res)
      }
    }
  },

  /**
   * 页面卸载
   */
  onUnload() {
    // 移除用户状态监听器
    hybridAuthService.removeUserStateListener(this.onUserStateChange.bind(this))
  }
})
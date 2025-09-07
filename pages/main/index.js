/**
 * 主页 - 支持混合访问模式
 * 匿名用户可以浏览公开投票，登录用户可以看到更多内容
 */

const surveyService = require("../../services/SurveyService.js");
const LoadingManager = require("../../utils/LoadingManager.js");
const { APP_CONFIG, ERROR_MESSAGES } = require("../../config/app.js");
const {
  getBanners,
  getRandomCover,
  getDefaultAvatar,
} = require("../../config/images.js");

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 页面状态
    loading: true,
    refreshing: false,
    loadingMore: false,

    // 投票列表
    surveys: [],
    currentPage: 1,
    hasMore: true,

    // 筛选和排序
    activeTab: "new", // 'new' | 'hot'
    searchKeyword: "",

    // UI状态
    typeNameFixed: false,
    scrollTop: 0,

    // 轮播图
    bannerUrls: [],
    bannerTxt: [],
    indicatorDots: false,
    autoplay: true,
    interval: 5000,
    duration: 1000,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad() {
    // 页面加载完成，等待 onShow 加载数据
  },

  /**
   * 生命周期函数--监听页面显示
   */
  async onShow() {
    // 加载页面数据
    await this.loadPageData();
  },
  /**
   * 加载页面数据
   */
  async loadPageData() {
    try {
      // 使用LoadingManager监控页面加载性能
      await LoadingManager.monitorPageLoad("main", async () => {
        this.setData({
          loading: true,
          loadStartTime: Date.now(),
        });

        // 并行加载轮播图和投票列表
        await Promise.all([
          this.loadBanners(),
          this.loadSurveys(true), // 重置列表
        ]);

        // 添加最小加载时间，确保骨架屏有足够的展示时间
        await this.ensureMinimumLoadingTime(800);

        this.setData({ loading: false });
      });
    } catch (error) {
      console.error("Load page data failed:", error);
      LoadingManager.showError("页面加载失败，请重试");
      this.setData({ loading: false });
    }
  },

  /**
   * 确保最小加载时间
   * 避免骨架屏闪烁，提供更好的用户体验
   */
  async ensureMinimumLoadingTime(minTime = 500) {
    const loadStartTime = this.data.loadStartTime || Date.now();
    const elapsed = Date.now() - loadStartTime;

    if (elapsed < minTime) {
      await new Promise((resolve) => setTimeout(resolve, minTime - elapsed));
    }
  },

  /**
   * 加载轮播图
   */
  async loadBanners() {
    // 使用配置文件中的轮播图资源
    const bannerUrls = getBanners();
    const bannerTexts = [
      "欢迎使用投票小程序",
      "创建你的第一个投票",
      "参与热门投票话题",
    ];

    this.setData({
      bannerUrls: bannerUrls,
      bannerTxt: bannerTexts,
    });
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
        hasMore: true,
      });
    }

    if (!this.data.hasMore && !reset) {
      return;
    }

    const { currentPage, activeTab, searchKeyword } = this.data;

    try {
      // 根据当前标签确定排序方式
      const orderBy = activeTab === "new" ? "created_at" : "total_votes";

      const { data, error, hasMore } = await surveyService.getPublicSurveys({
        page: currentPage,
        limit: APP_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
        orderBy: orderBy,
        orderDirection: "desc",
        searchKeyword: searchKeyword,
      });

      if (error) {
        wx.showToast({
          title: error,
          icon: "none",
        });
        return;
      }

      // 格式化时间并添加默认图片
      const formattedData = data.map((survey) => ({
        ...survey,
        created_at: this.formatDate(survey.created_at),
        defaultCover: getRandomCover(),
        defaultAvatar: getDefaultAvatar(),
      }));

      const newSurveys = reset
        ? formattedData
        : [...this.data.surveys, ...formattedData];

      this.setData({
        surveys: newSurveys,
        currentPage: reset ? 2 : currentPage + 1,
        hasMore: hasMore,
        refreshing: false,
        loadingMore: false,
      });
    } catch (error) {
      console.error("Load surveys failed:", error);
      wx.showToast({
        title: ERROR_MESSAGES.NETWORK.CONNECTION_ERROR,
        icon: "none",
      });
    }
  },

  /**
   * 标签切换
   */
  async onTabChange(e) {
    const typeName = e.currentTarget.dataset.typeName;

    if (typeName === this.data.activeTab) {
      return;
    }

    this.setData({ activeTab: typeName });

    // 重新加载投票列表
    await this.loadSurveys(true);
  },
  /**
   * 投票卡片点击
   */
  async onSurveyTap(e) {
    const survey = e.currentTarget.dataset.survey;

    if (!survey || !survey.id) {
      return;
    }

    // 直接导航到投票结果页面
    const url = `/pages/result/index?surveyId=${survey.id}`;
    wx.navigateTo({ url });
  },

  /**
   * 滚动事件处理
   */
  onScroll(e) {
    const scrollTop = e.detail.scrollTop;
    const typeNameFixed = scrollTop >= 150;

    this.setData({
      typeNameFixed,
      scrollTop,
    });
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    this.setData({ refreshing: true });

    try {
      await this.loadPageData();
    } finally {
      wx.stopPullDownRefresh();
      this.setData({ refreshing: false });
    }
  },

  /**
   * 上拉加载更多
   */
  async onReachBottom() {
    if (this.data.loadingMore || !this.data.hasMore) {
      return;
    }

    this.setData({ loadingMore: true });
    await this.loadSurveys(false);
  },

  /**
   * 格式化日期为年月日格式
   * @param {string} dateString ISO日期字符串
   * @returns {string} 格式化后的日期字符串 (YYYY-MM-DD)
   */
  formatDate(dateString) {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Date format error:", error);
      return dateString;
    }
  },

  /**
   * 分享功能
   */
  onShareAppMessage() {
    return {
      title: "邀请您参与投票",
      path: "/pages/main/index",
      success: (res) => {
        console.log("Share success:", res);
      },
      fail: (res) => {
        console.log("Share failed:", res);
      },
    };
  },
});

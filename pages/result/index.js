/**
 * 投票结果页面
 * 支持投票参与和结果展示
 */

import hybridAuthService from "../../services/HybridAuthService.js";
import surveyService from "../../services/SurveyService.js";
import NavigationHelper from "../../utils/NavigationHelper.js";
import {
  APP_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "../../config/app.js";

Page({
  data: {
    // 投票信息
    survey: null,
    options: [],
    surveyId: null,

    // 用户状态
    user: null,
    isAuthenticated: false,
    hasParticipated: false,
    userSelections: [],

    // 投票统计
    totalVotes: 0,
    totalParticipants: 0,

    // UI状态
    loading: true,
    submitting: false,
    showResults: false,
    showError: false,
    errorMessage: "",

    // 投票状态
    isExpired: false,
    canParticipate: true,

    // 显示设置
    showParticipants: true,
    maxParticipantsShow: 5,
  },

  /**
   * 页面加载
   */
  async onLoad(options) {
    const { surveyId } = options;

    if (!surveyId) {
      this.showErrorMessage("投票ID无效");
      // 延迟返回，确保错误消息显示
      setTimeout(() => {
        NavigationHelper.navigateBack();
      }, 1500);
      return;
    }

    this.setData({ surveyId });

    // 初始化认证服务
    await hybridAuthService.initialize();
    this.updateUserState();

    // 加载投票数据
    await this.loadSurveyData();
  },

  /**
   * 页面显示
   */
  onShow() {
    this.updateUserState();
  },

  /**
   * 更新用户状态
   */
  updateUserState() {
    const user = hybridAuthService.getCurrentUser();
    const isAuthenticated = hybridAuthService.isUserAuthenticated();

    this.setData({
      user: user,
      isAuthenticated: isAuthenticated,
    });
  },

  /**
   * 加载投票数据
   */
  async loadSurveyData() {
    this.setData({ loading: true });

    try {
      const { data, error } = await surveyService.getSurveyDetail(
        this.data.surveyId
      );

      if (error) {
        this.showErrorMessage(error);
        return;
      }

      if (!data) {
        this.showErrorMessage("投票不存在");
        return;
      }

      // 计算选项百分比
      const totalVotes = data.total_votes || 0;
      const optionsWithPercentage = (data.options || []).map((option) => ({
        ...option,
        percentage:
          totalVotes > 0
            ? Math.round((option.vote_count / totalVotes) * 100)
            : 0,
      }));

      // 设置投票数据
      this.setData({
        survey: data,
        options: optionsWithPercentage,
        hasParticipated: data.hasParticipated || false,
        totalVotes: totalVotes,
        totalParticipants: data.total_participants || 0,
      });

      // 检查投票状态
      this.checkSurveyStatus();

      // 如果已参与，显示结果
      if (data.hasParticipated) {
        this.setData({ showResults: true });
        await this.loadUserParticipation();
      }
    } catch (error) {
      console.error("Load survey data failed:", error);
      this.showErrorMessage("加载投票失败");
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 检查投票状态
   */
  checkSurveyStatus() {
    const { survey } = this.data;

    if (!survey) return;

    // 检查是否过期
    let isExpired = false;
    let canParticipate = true;

    if (survey.end_time) {
      const endTime = new Date(survey.end_time);
      const now = new Date();
      isExpired = now > endTime;
    }

    // 检查是否可以参与
    if (isExpired) {
      canParticipate = false;
    } else if (
      survey.access_level === "authenticated" &&
      !this.data.isAuthenticated
    ) {
      canParticipate = false;
    } else if (this.data.hasParticipated) {
      canParticipate = false;
    }

    this.setData({
      isExpired,
      canParticipate,
    });
  },

  /**
   * 加载用户参与记录
   */
  async loadUserParticipation() {
    if (!this.data.isAuthenticated || !this.data.hasParticipated) {
      return;
    }

    try {
      // 这里可以加载用户的具体选择记录
      // 暂时使用简单的逻辑
      this.setData({ userSelections: [] });
    } catch (error) {
      console.error("Load user participation failed:", error);
    }
  },

  /**
   * 选项选择处理
   */
  onOptionSelect(e) {
    if (!this.data.canParticipate) {
      if (!this.data.isAuthenticated) {
        NavigationHelper.showAuthPrompt("参与投票需要先授权");
      } else if (this.data.hasParticipated) {
        this.showErrorMessage("您已经参与过此投票");
      } else if (this.data.isExpired) {
        this.showErrorMessage("投票已结束");
      }
      return;
    }

    const optionId = e.currentTarget.dataset.optionId;
    const { survey, userSelections } = this.data;

    let newSelections = [...userSelections];

    if (survey.survey_type === "single") {
      // 单选：替换选择
      newSelections = [optionId];
    } else {
      // 多选：切换选择
      const index = newSelections.indexOf(optionId);
      if (index > -1) {
        newSelections.splice(index, 1);
      } else {
        newSelections.push(optionId);
      }
    }

    this.setData({ userSelections: newSelections });
  },

  /**
   * 提交投票
   */
  async onSubmitVote() {
    if (this.data.submitting) return;

    const { userSelections, isAuthenticated } = this.data;

    // 检查授权状态
    if (!isAuthenticated) {
      const authorized = await NavigationHelper.showAuthPrompt(
        "参与投票需要先授权"
      );
      if (!authorized) return;

      // 重新检查状态
      this.updateUserState();
      if (!this.data.isAuthenticated) return;
    }

    // 验证选择
    if (!userSelections || userSelections.length === 0) {
      this.showErrorMessage("请选择投票选项");
      return;
    }

    this.setData({ submitting: true });

    try {
      const { success, error } = await surveyService.participateInSurvey(
        this.data.surveyId,
        userSelections
      );

      if (success) {
        wx.showToast({
          title: SUCCESS_MESSAGES.SURVEY.PARTICIPATE_SUCCESS,
          icon: "success",
        });

        // 更新状态并显示结果
        this.setData({
          hasParticipated: true,
          canParticipate: false,
          showResults: true,
        });

        // 重新加载数据以获取最新统计
        await this.loadSurveyData();
      } else {
        this.showErrorMessage(error || "投票失败");
      }
    } catch (error) {
      console.error("Submit vote failed:", error);
      this.showErrorMessage("投票失败，请重试");
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 切换结果显示
   */
  onToggleResults() {
    this.setData({
      showResults: !this.data.showResults,
    });
  },

  /**
   * 分享功能
   */
  onShareAppMessage() {
    const { survey } = this.data;

    return {
      title: survey?.title || "投票分享",
      path: `/pages/result/index?surveyId=${this.data.surveyId}`,
      success: (res) => {
        console.log("Share success:", res);
      },
      fail: (res) => {
        console.log("Share failed:", res);
      },
    };
  },

  /**
   * 导航到创建投票页面
   */
  async navigateToCreate() {
    await NavigationHelper.navigateTo("/pages/index/index", {
      showAuthPrompt: true,
      authPromptMessage: "创建投票需要先授权",
    });
  },

  /**
   * 授权按钮点击
   */
  async onAuthorizeTap() {
    const result = await NavigationHelper.handleAuthorization();

    if (result.success) {
      // 授权成功后重新检查状态
      this.updateUserState();
      this.checkSurveyStatus();
    }
  },

  /**
   * 显示错误消息
   */
  showErrorMessage(message) {
    this.setData({
      showError: true,
      errorMessage: message,
    });

    setTimeout(() => {
      this.setData({ showError: false });
    }, 3000);
  },
});

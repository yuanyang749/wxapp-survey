/**
 * 投票创建页面
 * 使用 Supabase 数据库替代 LeanCloud
 */

import hybridAuthService from '../../services/HybridAuthService.js'
import fileUploadService from '../../services/FileUploadService.js'
import NavigationHelper from '../../utils/NavigationHelper.js'
import { supabase } from '../../config/supabase.js'
import { APP_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../config/app.js'

Page({
  data: {
    // 用户状态
    user: null,
    isAuthenticated: false,

    // 表单数据
    title: '',
    description: '',
    surveyType: 'single_choice', // 'single_choice' | 'multiple_choice'
    accessLevel: 'public', // 'public' | 'authenticated' | 'owner_only'
    endTime: '',

    // 选项管理
    options: [
      { text: '', order: 0 },
      { text: '', order: 1 }
    ],
    minOptions: 2,
    maxOptions: 10,

    // 文件上传
    coverImage: null,
    uploadedFiles: [],
    uploading: false,

    // UI状态
    loading: false,
    submitting: false,
    showError: false,
    errorMessage: '',

    // 日期时间
    currentDate: '',
    maxDate: '',
    currentTime: '23:59'
  },

  /**
   * 页面加载
   */
  async onLoad() {
    // 检查授权状态
    await hybridAuthService.initialize()

    const isAuthenticated = hybridAuthService.isUserAuthenticated()
    if (!isAuthenticated) {
      // 需要授权才能创建投票
      const authorized = await NavigationHelper.showAuthPrompt('创建投票需要先授权')
      if (!authorized) {
        // 延迟返回，确保用户看到提示
        setTimeout(() => {
          NavigationHelper.navigateBack()
        }, 500)
        return
      }
    }

    this.updateUserState()
    this.initializeForm()
  },

  /**
   * 页面显示
   */
  onShow() {
    this.updateUserState()
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
   * 初始化表单
   */
  initializeForm() {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const maxDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())

    this.setData({
      currentDate: this.formatDate(tomorrow),
      maxDate: this.formatDate(maxDate),
      endTime: this.formatDate(tomorrow),
      loading: false
    })
  },
  /**
   * 表单输入处理
   */
  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value })
  },

  onSurveyTypeChange(e) {
    this.setData({ surveyType: e.detail.value })
  },

  onAccessLevelChange(e) {
    this.setData({ accessLevel: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ endTime: e.detail.value })
  },

  onTimeChange(e) {
    this.setData({ currentTime: e.detail.value })
  },

  /**
   * 选项输入处理
   */
  onOptionInput(e) {
    const index = e.currentTarget.dataset.index
    const value = e.detail.value
    const options = [...this.data.options]

    options[index].text = value
    this.setData({ options })
  },
  /**
   * 添加选项
   */
  addOption() {
    const { options, maxOptions } = this.data

    if (options.length >= maxOptions) {
      this.showErrorMessage(`最多只能添加${maxOptions}个选项`)
      return
    }

    const newOptions = [...options, {
      text: '',
      order: options.length
    }]

    this.setData({ options: newOptions })
  },

  /**
   * 删除选项
   */
  deleteOption(e) {
    const index = e.currentTarget.dataset.index
    const { options, minOptions } = this.data

    if (options.length <= minOptions) {
      this.showErrorMessage(`至少需要${minOptions}个选项`)
      return
    }

    const newOptions = options.filter((_, i) => i !== index)
    // 重新排序
    newOptions.forEach((option, i) => {
      option.order = i
    })

    this.setData({ options: newOptions })
  },

  /**
   * 选择封面图片
   */
  async chooseCoverImage() {
    try {
      const res = await this.chooseImage(1)
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        this.setData({
          coverImage: res.tempFilePaths[0],
          uploading: false
        })
      }
    } catch (error) {
      console.error('Choose image failed:', error)
      this.showErrorMessage('选择图片失败')
    }
  },

  /**
   * 预览封面图片
   */
  previewCoverImage() {
    if (this.data.coverImage) {
      wx.previewImage({
        urls: [this.data.coverImage],
        current: this.data.coverImage
      })
    }
  },

  /**
   * 删除封面图片
   */
  deleteCoverImage() {
    this.setData({ coverImage: null })
  },
  /**
   * 表单提交
   */
  async onSubmit() {
    if (this.data.submitting) return

    // 表单验证
    const validation = this.validateForm()
    if (!validation.valid) {
      this.showErrorMessage(validation.message)
      return
    }

    this.setData({ submitting: true })

    try {
      // 上传封面图片
      let coverImageUrl = null
      if (this.data.coverImage) {
        const uploadResult = await this.uploadCoverImage()
        if (uploadResult.success) {
          coverImageUrl = uploadResult.data.fileUrl
        } else {
          throw new Error(uploadResult.error)
        }
      }

      // 创建投票
      const surveyResult = await this.createSurvey(coverImageUrl)
      if (!surveyResult.success) {
        throw new Error(surveyResult.error)
      }

      // 创建选项
      const optionsResult = await this.createSurveyOptions(surveyResult.data.id)
      if (!optionsResult.success) {
        throw new Error(optionsResult.error)
      }

      // 成功提示
      wx.showToast({
        title: SUCCESS_MESSAGES.SURVEY.CREATE_SUCCESS,
        icon: 'success'
      })

      // 跳转到投票详情页
      setTimeout(() => {
        NavigationHelper.redirectTo(`/pages/result/index?surveyId=${surveyResult.data.id}`)
      }, 1500)

    } catch (error) {
      console.error('Create survey failed:', error)
      this.showErrorMessage(error.message || ERROR_MESSAGES.SURVEY.CREATE_FAILED)
    } finally {
      this.setData({ submitting: false })
    }
  },
  /**
   * 上传封面图片
   */
  async uploadCoverImage() {
    try {
      this.setData({ uploading: true })

      const result = await fileUploadService.uploadFile(this.data.coverImage, {
        fileType: 'image',
        category: 'survey-covers'
      })

      return result

    } catch (error) {
      console.error('Upload cover image failed:', error)
      return {
        success: false,
        error: ERROR_MESSAGES.FILE.UPLOAD_FAILED
      }
    } finally {
      this.setData({ uploading: false })
    }
  },

  /**
   * 创建投票
   */
  async createSurvey(coverImageUrl) {
    try {
      const { title, description, surveyType, accessLevel, endTime, currentTime } = this.data
      const user = hybridAuthService.getCurrentUser()

      // 构建结束时间
      const endDateTime = endTime && currentTime
        ? new Date(`${endTime} ${currentTime}`).toISOString()
        : null

      const { data, error } = await supabase
        .from('surveys')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          survey_type: surveyType,
          access_level: accessLevel,
          cover_image_url: coverImageUrl,
          end_time: endDateTime,
          creator_id: user.id,
          app_id: APP_CONFIG.APP_ID,
          status: 'active'
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }

    } catch (error) {
      console.error('Create survey failed:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * 创建投票选项
   */
  async createSurveyOptions(surveyId) {
    try {
      const { options } = this.data

      // 过滤空选项并准备数据
      const validOptions = options
        .filter(option => option.text.trim())
        .map((option, index) => ({
          survey_id: surveyId,
          option_text: option.text.trim(),
          order_index: index,
          vote_count: 0
        }))

      if (validOptions.length < this.data.minOptions) {
        return {
          success: false,
          error: `至少需要${this.data.minOptions}个有效选项`
        }
      }

      const { data, error } = await supabase
        .from('survey_options')
        .insert(validOptions)
        .select()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }

    } catch (error) {
      console.error('Create survey options failed:', error)
      return { success: false, error: error.message }
    }
  },
  /**
   * 表单验证
   */
  validateForm() {
    const { title, options, surveyType, endTime, currentTime } = this.data

    // 标题验证
    if (!title.trim()) {
      return { valid: false, message: '请输入投票标题' }
    }

    if (title.trim().length > 100) {
      return { valid: false, message: '投票标题不能超过100个字符' }
    }

    // 选项验证
    const validOptions = options.filter(option => option.text.trim())

    if (validOptions.length < this.data.minOptions) {
      return { valid: false, message: `至少需要${this.data.minOptions}个选项` }
    }

    // 检查选项是否有重复
    const optionTexts = validOptions.map(option => option.text.trim())
    const uniqueTexts = [...new Set(optionTexts)]

    if (optionTexts.length !== uniqueTexts.length) {
      return { valid: false, message: '选项内容不能重复' }
    }

    // 结束时间验证
    if (endTime && currentTime) {
      const endDateTime = new Date(`${endTime} ${currentTime}`)
      const now = new Date()

      if (endDateTime <= now) {
        return { valid: false, message: '结束时间必须晚于当前时间' }
      }
    }

    return { valid: true, message: '' }
  },

  /**
   * 显示错误消息
   */
  showErrorMessage(message) {
    this.setData({
      showError: true,
      errorMessage: message
    })

    setTimeout(() => {
      this.setData({ showError: false })
    }, 3000)
  },

  /**
   * 选择图片
   */
  chooseImage(count = 1) {
    return new Promise((resolve, reject) => {
      wx.chooseImage({
        count: count,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject
      })
    })
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  },
  /**
   * 分享功能
   */
  onShareAppMessage() {
    const { user } = this.data
    const nickName = user?.profile?.nickname || '朋友'

    return {
      title: `${nickName}邀请您一起创建投票`,
      path: '/pages/index/index',
      success: (res) => {
        console.log('Share success:', res)
      },
      fail: (res) => {
        console.log('Share failed:', res)
      }
    }
  }
})

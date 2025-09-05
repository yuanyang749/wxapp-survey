/**
 * 微信小程序投票系统 - 应用配置
 * 支持混合认证模式：匿名访问 + 微信登录
 */

// 应用基础配置
const APP_CONFIG = {
  // 应用标识
  APP_ID: 'wxapp_survey_2025',
  APP_NAME: '微信投票小程序',
  APP_TYPE: 'hybrid',
  
  // Supabase 配置
  SUPABASE_URL: 'https://ayhctecivrtbeslxvaov.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5aGN0ZWNpdnJ0YmVzbHh2YW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODQ3NzIsImV4cCI6MjA3MjQ2MDc3Mn0.TGpey-ss7GtqX_ZSgduKVBgMf3q1QgNpkNRv49Aob-M',
  
  // 页面访问权限配置
  PAGE_ACCESS: {
    // 公开页面 - 支持匿名访问
    PUBLIC: [
      'pages/main/index',     // 浏览投票列表
      'pages/result/index',   // 查看投票结果  
      'pages/about/index'     // 关于页面
    ],
    
    // 私有页面 - 需要登录
    PRIVATE: [
      'pages/index/index',        // 创建投票
      'pages/mine/index',         // 个人中心
      'pages/mySurvey/index',     // 我的投票
      'pages/participate/index',  // 参与记录
      'pages/edit/index'          // 编辑投票
    ]
  },
  
  // 投票访问级别
  SURVEY_ACCESS_LEVELS: {
    PUBLIC: 'public',           // 完全公开
    AUTHENTICATED: 'authenticated', // 需要登录
    OWNER_ONLY: 'owner_only'    // 仅创建者
  },
  
  // 投票类型
  SURVEY_TYPES: {
    SINGLE: 'single_choice',    // 单选
    MULTIPLE: 'multiple_choice' // 多选
  },
  
  // 文件上传配置
  FILE_UPLOAD: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    BUCKET_NAME: 'survey-files'
  },
  
  // 分页配置
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 50
  }
}

// 页面权限检查工具
const PageAccessHelper = {
  /**
   * 检查页面是否需要登录
   * @param {string} pagePath 页面路径
   * @returns {boolean} 是否需要登录
   */
  requiresAuth(pagePath) {
    return APP_CONFIG.PAGE_ACCESS.PRIVATE.includes(pagePath)
  },
  
  /**
   * 检查页面是否支持匿名访问
   * @param {string} pagePath 页面路径
   * @returns {boolean} 是否支持匿名访问
   */
  allowsAnonymous(pagePath) {
    return APP_CONFIG.PAGE_ACCESS.PUBLIC.includes(pagePath)
  }
}

// 错误消息配置
const ERROR_MESSAGES = {
  AUTH: {
    AUTH_REQUIRED: '此功能需要授权后使用',
    LOGIN_REQUIRED: '请先登录后再使用此功能',
    AUTH_FAILED: '授权失败，请重试',
    PERMISSION_DENIED: '您没有权限执行此操作'
  },
  
  SURVEY: {
    NOT_FOUND: '投票不存在或已被删除',
    ACCESS_DENIED: '您没有权限访问此投票',
    ALREADY_PARTICIPATED: '您已经参与过此投票',
    EXPIRED: '投票已结束',
    INVALID_OPTIONS: '请选择有效的投票选项'
  },
  
  FILE: {
    UPLOAD_FAILED: '文件上传失败',
    SIZE_EXCEEDED: '文件大小超过限制',
    TYPE_NOT_ALLOWED: '不支持的文件类型'
  },
  
  NETWORK: {
    CONNECTION_ERROR: '网络连接失败，请检查网络设置',
    SERVER_ERROR: '服务器错误，请稍后重试'
  }
}

// 成功消息配置
const SUCCESS_MESSAGES = {
  AUTH: {
    AUTH_SUCCESS: '授权成功',
    AUTH_RESTORED: '授权状态已恢复'
  },
  
  SURVEY: {
    CREATE_SUCCESS: '投票创建成功',
    UPDATE_SUCCESS: '投票更新成功',
    DELETE_SUCCESS: '投票删除成功',
    PARTICIPATE_SUCCESS: '投票成功'
  },
  
  FILE: {
    UPLOAD_SUCCESS: '文件上传成功'
  }
}

// 导出模块
module.exports = {
  APP_CONFIG,
  PageAccessHelper,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
}

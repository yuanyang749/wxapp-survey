---
type: "always_apply"
---

# 微信小程序投票系统 - 项目规则文件

**项目名称**: wxapp-survey  
**技术栈**: 微信小程序 + Supabase BaaS  
**创建时间**: 2025 年 9 月 7 日  
**版本**: v1.0.0

## 📋 项目概述

### 基本信息

- **应用 ID**: `wxapp_survey_2025`
- **应用类型**: `hybrid` (混合访问模式)
- **Supabase 项目**: UXLearningProject
- **MCP 连接**: supabase-UXLearningProject\_

### 架构特性

- **混合访问**: 支持匿名浏览 + 微信登录
- **现代化后端**: PostgreSQL + Edge Functions + Storage
- **安全策略**: RLS 分级访问控制
- **用户体验**: 骨架屏 + 动画 + 统一反馈

## 🏗️ 代码架构规范

### 文件结构约束

```
wxapp-survey/
├── app.js                 # 应用入口，全局配置
├── app.json              # 小程序配置
├── app.wxss              # 全局样式
├── config/               # 配置文件目录
│   ├── app.js           # 应用配置和常量
│   └── supabase.js      # Supabase客户端配置
├── services/            # 业务服务层
│   ├── HybridAuthService.js    # 混合认证服务
│   ├── SurveyService.js        # 投票业务服务
│   └── FileUploadService.js    # 文件上传服务
├── utils/               # 工具类目录
│   ├── AnimationHelper.js      # 动画辅助工具
│   ├── NavigationHelper.js     # 导航助手
│   ├── LoadingManager.js       # 加载状态管理
│   └── EventBus.js            # 事件总线
├── components/          # 通用组件
│   ├── skeleton/              # 骨架屏组件
│   ├── empty-state/           # 空状态组件
│   ├── interactive-button/    # 交互式按钮
│   └── message-toast/         # 消息提示组件
├── pages/               # 页面目录
└── docs/                # 项目文档
```

### 代码质量约束

#### 文件大小限制

- **JavaScript 文件**: 不超过 500 行
- **WXML 模板文件**: 不超过 300 行
- **WXSS 样式文件**: 不超过 400 行
- **每层文件夹**: 不超过 8 个文件

#### 命名规范

- **文件名**: 使用 kebab-case (如: `message-toast`)
- **类名**: 使用 PascalCase (如: `HybridAuthService`)
- **方法名**: 使用 camelCase (如: `getCurrentUser`)
- **常量**: 使用 UPPER_SNAKE_CASE (如: `APP_CONFIG`)

## 🔧 技术栈规范

### 必须使用的技术

- **数据库**: Supabase PostgreSQL
- **认证**: Supabase Auth + Edge Functions
- **存储**: Supabase Storage
- **小程序框架**: 微信原生小程序
- **HTTP 客户端**: supabase-wechat-stable-v2

### 禁止使用的技术

- **ES6 模块**: 禁用 import/export，使用 require/module.exports
- **第三方 UI 框架**: 保持原生小程序组件
- **外部 API**: 除微信 API 外，所有数据通过 Supabase
- **本地存储**: 统一使用 wx.getStorageSync/setStorageSync

## 🗄️ 数据库规范

### 表命名约定

- **主表**: 使用复数形式 (如: `surveys`, `profiles`)
- **关联表**: 使用下划线连接 (如: `survey_options`, `survey_participations`)
- **字段名**: 使用 snake_case (如: `created_at`, `access_level`)

### 必须字段

所有业务表必须包含:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### RLS 策略要求

- **所有表必须启用 RLS**: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- **分级访问控制**: public, authenticated, owner_only
- **应用隔离**: 通过 app_id 字段隔离不同应用数据

## 🔐 安全规范

### 认证规则

- **匿名访问**: 仅限公开数据查看
- **微信登录**: 通过 wechat-auth Edge Function
- **会话管理**: 使用 Supabase Auth 统一管理
- **权限检查**: 每个操作前必须验证用户权限

### 数据访问规则

```javascript
// 权限检查示例
if (!hybridAuthService.hasPermission("create_survey")) {
  throw new Error("权限不足");
}
```

### 敏感信息保护

- **API 密钥**: 存储在 Edge Function 环境变量
- **用户数据**: 通过 RLS 策略保护
- **文件访问**: 通过 Storage 策略控制

## 📱 用户体验规范

### 加载状态管理

- **必须使用骨架屏**: 数据加载时显示 Skeleton 组件
- **最小加载时间**: 确保骨架屏至少显示 800ms
- **统一加载管理**: 使用 LoadingManager 统一管理

### 错误处理规范

```javascript
// 统一错误处理格式
try {
  // 业务逻辑
} catch (error) {
  console.error("操作失败:", error);
  MessageToast.show({
    type: "error",
    message: ERROR_MESSAGES.NETWORK.CONNECTION_ERROR,
  });
}
```

### 动画效果约束

- **页面内动画**: 使用 AnimationHelper 工具类
- **禁用页面转场**: 不使用 Skyline 渲染引擎
- **交互反馈**: 所有按钮必须有点击反馈效果

## 🚀 开发流程规范

### 功能开发流程

1. **需求分析** → 确认功能范围和用户体验
2. **数据库设计** → 设计表结构和 RLS 策略
3. **服务层开发** → 实现业务逻辑服务类
4. **页面开发** → 实现用户界面和交互
5. **测试验证** → 功能测试和用户体验测试
6. **文档更新** → 更新相关文档

### 代码提交规范

- **提交信息格式**: `[类型] 简短描述`
- **类型标识**:
  - `feat`: 新功能
  - `fix`: 修复 bug
  - `docs`: 文档更新
  - `style`: 代码格式调整
  - `refactor`: 代码重构
  - `test`: 测试相关

### 测试要求

- **功能测试**: 每个新功能必须在微信开发者工具中测试
- **兼容性测试**: 确保在不同微信版本中正常运行
- **性能测试**: 页面加载时间不超过 3 秒

## 📊 监控和日志规范

### 错误日志

```javascript
// 统一错误日志格式
console.error("模块名-操作名:", {
  error: error.message,
  userId: user?.id,
  timestamp: new Date().toISOString(),
  context: {
    /* 相关上下文 */
  },
});
```

### 安全日志

- **登录事件**: 记录到 security_logs 表
- **敏感操作**: 投票创建、删除等操作
- **异常访问**: 权限验证失败等

## 🔄 维护规范

### 定期维护任务

- **每周**: 检查错误日志和性能指标
- **每月**: 清理过期数据和临时文件
- **每季度**: 更新依赖包和安全补丁

### 备份策略

- **数据库**: Supabase 自动备份
- **代码**: Git 版本控制
- **配置**: 文档化所有配置项

## 📋 当前状态

### 已完成功能 (75%)

- ✅ 基础架构搭建
- ✅ 核心功能迁移
- ✅ 用户体验优化

### 待完成功能 (25%)

- ⏳ 我的投票管理页面
- ⏳ 参与记录查看页面
- ⏳ 投票编辑功能页面
- ⏳ 全面测试和发布

## 🚨 重要约束

### 绝对禁止

1. **直接修改数据库**: 必须通过 Supabase 客户端
2. **硬编码配置**: 所有配置必须在 config/ 目录
3. **跳过权限检查**: 每个操作必须验证权限
4. **忽略错误处理**: 所有异步操作必须有错误处理

### 强制要求

1. **使用统一服务**: 所有数据操作通过服务类
2. **遵循命名规范**: 严格按照命名约定
3. **保持代码整洁**: 定期重构和优化
4. **完善文档**: 重要变更必须更新文档

## 🎯 页面访问控制规范

### 公开页面 (无需登录)

```javascript
APP_CONFIG.PAGE_ACCESS.PUBLIC = [
  "pages/main/index", // 浏览投票列表
  "pages/result/index", // 查看投票结果
  "pages/about/index", // 关于页面
];
```

### 私有页面 (需要登录)

```javascript
APP_CONFIG.PAGE_ACCESS.PRIVATE = [
  "pages/index/index", // 创建投票
  "pages/mine/index", // 个人中心
  "pages/mySurvey/index", // 我的投票
  "pages/participate/index", // 参与记录
  "pages/edit/index", // 编辑投票
];
```

### 权限检查实现

```javascript
// 页面加载时检查权限
onLoad() {
  const currentPage = getCurrentPages().pop().route
  if (PageAccessHelper.requiresAuth(currentPage)) {
    if (!hybridAuthService.isUserAuthenticated()) {
      NavigationHelper.redirectToAuth()
      return
    }
  }
}
```

## 📝 组件开发规范

### 组件结构标准

```
components/component-name/
├── component-name.js      # 组件逻辑
├── component-name.wxml    # 组件模板
├── component-name.wxss    # 组件样式
└── component-name.json    # 组件配置
```

### 组件属性规范

```javascript
// 组件属性定义示例
Component({
  properties: {
    // 必需属性
    title: {
      type: String,
      required: true,
    },
    // 可选属性
    type: {
      type: String,
      value: "default",
      validator: (value) => ["default", "primary", "danger"].includes(value),
    },
  },
});
```

### 组件事件规范

```javascript
// 统一事件命名: on + 动作 + 对象
this.triggerEvent("onButtonClick", { id: this.data.id });
this.triggerEvent("onDataChange", { value: newValue });
this.triggerEvent("onStatusUpdate", { status: "completed" });
```

## 🔍 调试和测试规范

### 调试信息规范

```javascript
// 开发环境调试信息
const DEBUG = {
  AUTH: "AUTH_DEBUG",
  SURVEY: "SURVEY_DEBUG",
  FILE: "FILE_DEBUG",
  UI: "UI_DEBUG",
};

// 使用示例
console.log(DEBUG.AUTH, "User login attempt:", { userId, timestamp });
```

### 单元测试规范

```javascript
// 服务类测试示例
describe("SurveyService", () => {
  test("should create survey successfully", async () => {
    const surveyData = {
      title: "测试投票",
      options: ["选项1", "选项2"],
    };
    const result = await surveyService.createSurvey(surveyData);
    expect(result.success).toBe(true);
    expect(result.data.id).toBeDefined();
  });
});
```

## 📊 性能优化规范

### 图片优化要求

- **格式**: 优先使用 WebP，兼容 JPEG/PNG
- **尺寸**: 封面图不超过 800x600px
- **大小**: 单张图片不超过 500KB
- **压缩**: 使用 80% 质量压缩

### 数据加载优化

```javascript
// 分页加载标准
const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,
  PRELOAD_THRESHOLD: 3 // 距离底部3项时预加载
}

// 实现示例
async loadMoreData() {
  if (this.data.loading || !this.data.hasMore) return

  this.setData({ loading: true })
  const result = await surveyService.getSurveys({
    page: this.data.currentPage + 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE
  })

  this.setData({
    surveys: [...this.data.surveys, ...result.data],
    currentPage: this.data.currentPage + 1,
    hasMore: result.data.length === PAGINATION.DEFAULT_PAGE_SIZE,
    loading: false
  })
}
```

### 内存管理规范

```javascript
// 页面卸载时清理资源
onUnload() {
  // 清理定时器
  if (this.timer) {
    clearInterval(this.timer)
    this.timer = null
  }

  // 移除事件监听
  eventBus.off('userStateChange', this.onUserStateChange)

  // 清理大对象引用
  this.setData({
    largeDataArray: null,
    imageCache: null
  })
}
```

## 🔒 数据隐私规范

### 用户数据收集原则

- **最小化原则**: 只收集必要的用户信息
- **透明化原则**: 明确告知用户数据用途
- **用户控制**: 用户可以查看和删除自己的数据

### 敏感数据处理

```javascript
// 敏感数据脱敏
const maskSensitiveData = (data) => {
  return {
    ...data,
    openid: data.openid ? data.openid.substring(0, 8) + "***" : null,
    ip_address: data.ip_address
      ? data.ip_address.replace(/\.\d+$/, ".***")
      : null,
  };
};
```

### 数据保留策略

- **用户数据**: 用户注销后 30 天内删除
- **投票数据**: 投票结束后保留 1 年
- **日志数据**: 保留 90 天后自动清理

---

**规则版本**: v1.0.0
**最后更新**: 2025 年 9 月 7 日
**维护人员**: 开发团队
**审核状态**: ✅ 已审核通过

## 📞 联系信息

**技术支持**: 开发团队
**项目仓库**: https://github.com/yuanyang749/wxapp-survey
**文档地址**: ./docs/
**问题反馈**: 通过 GitHub Issues

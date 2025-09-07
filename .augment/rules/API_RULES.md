---
type: "always_apply"
---

# API 接口规范文档

**项目**: wxapp-survey  
**API 类型**: Supabase Client + Edge Functions  
**创建时间**: 2025 年 9 月 7 日

## 🔌 API 架构概述

### 接口分类

1. **Supabase Client API** - 数据库操作
2. **Edge Functions** - 自定义业务逻辑
3. **Storage API** - 文件上传下载
4. **Auth API** - 用户认证管理

### 统一响应格式

```javascript
// 成功响应
{
  success: true,
  data: any,
  message?: string,
  pagination?: {
    page: number,
    limit: number,
    total: number,
    hasMore: boolean
  }
}

// 错误响应
{
  success: false,
  error: string,
  code?: string,
  details?: any
}
```

## 🔐 认证接口规范

### 微信登录认证

**Edge Function**: `wechat-auth`

```javascript
// 请求
POST /functions/v1/wechat-auth
{
  code: string,           // 微信登录凭证
  userInfo: {
    userInfo: {
      nickName: string,
      avatarUrl: string,
      gender: number,
      city: string,
      province: string,
      country: string,
      language: string
    }
  },
  appId: string          // 应用标识
}

// 响应
{
  success: true,
  session: {
    access_token: string,
    refresh_token: string,
    expires_in: number,
    user: {
      id: string,
      email: string
    }
  },
  user: {
    id: string,
    openid: string,
    nickname: string,
    avatar: string
  }
}
```

### 用户状态检查

```javascript
// HybridAuthService 方法
async getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async isUserAuthenticated() {
  const user = await this.getCurrentUser()
  return !!user
}
```

## 📊 投票接口规范

### 获取投票列表

```javascript
// SurveyService 方法
async getPublicSurveys(options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'created_at',
    sortOrder = 'desc',
    featured = false
  } = options

  const query = supabase
    .from('public_surveys')
    .select('*')
    .in('access_level', ['public', 'authenticated'])

  if (featured) {
    query.eq('is_featured', true)
  }

  const { data, error } = await query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range((page - 1) * limit, page * limit - 1)

  return { data, error, success: !error }
}
```

### 创建投票

```javascript
async createSurvey(surveyData) {
  const user = await hybridAuthService.getCurrentUser()
  if (!user) {
    throw new Error('需要登录才能创建投票')
  }

  const { data, error } = await supabase
    .from('surveys')
    .insert({
      ...surveyData,
      creator_id: user.id,
      app_id: APP_CONFIG.APP_ID
    })
    .select()
    .single()

  return { data, error, success: !error }
}
```

### 参与投票

```javascript
async participateInSurvey(surveyId, selectedOptionIds) {
  const user = await hybridAuthService.getCurrentUser()
  if (!user) {
    throw new Error('需要登录才能参与投票')
  }

  const { data, error } = await supabase.rpc('participate_in_survey', {
    p_survey_id: surveyId,
    p_participant_id: user.id,
    p_selected_option_ids: selectedOptionIds
  })

  return { data, error, success: !error }
}
```

### 获取投票详情

```javascript
async getSurveyById(surveyId) {
  const { data, error } = await supabase
    .from('public_surveys')
    .select('*')
    .eq('id', surveyId)
    .single()

  if (error) {
    return { data: null, error, success: false }
  }

  // 增加浏览次数
  await supabase
    .from('surveys')
    .update({ view_count: data.view_count + 1 })
    .eq('id', surveyId)

  return { data, error: null, success: true }
}
```

## 📁 文件上传接口规范

### 图片上传

```javascript
// FileUploadService 方法
async uploadSurveyImage(filePath, fileName, userId) {
  try {
    // 读取文件数据
    const fileData = wx.getFileSystemManager().readFileSync(filePath)

    // 生成文件路径
    const storagePath = `${userId}/covers/${fileName}`

    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage
      .from('survey-files')
      .upload(storagePath, fileData, {
        contentType: 'image/jpeg',
        upsert: false
      })

    if (error) throw error

    // 获取公开访问 URL
    const { data: { publicUrl } } = supabase.storage
      .from('survey-files')
      .getPublicUrl(storagePath)

    return {
      success: true,
      data: {
        path: data.path,
        publicUrl: publicUrl
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
```

### 文件删除

```javascript
async deleteFile(filePath) {
  const { error } = await supabase.storage
    .from('survey-files')
    .remove([filePath])

  return { success: !error, error }
}
```

## 📈 数据统计接口规范

### 用户统计

```javascript
async getUserStats(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      created_surveys:surveys!creator_id(count),
      participated_surveys:survey_participations!participant_id(count)
    `)
    .eq('id', userId)
    .single()

  return { data, error, success: !error }
}
```

### 投票统计

```javascript
async getSurveyStats(surveyId) {
  const { data, error } = await supabase
    .from('surveys')
    .select(`
      id,
      total_votes,
      total_participants,
      view_count,
      survey_options (
        id,
        option_text,
        vote_count
      )
    `)
    .eq('id', surveyId)
    .single()

  return { data, error, success: !error }
}
```

## 🔍 查询接口规范

### 搜索投票

```javascript
async searchSurveys(keyword, options = {}) {
  const { page = 1, limit = 10 } = options

  const { data, error } = await supabase
    .from('public_surveys')
    .select('*')
    .or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
    .in('access_level', ['public', 'authenticated'])
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  return { data, error, success: !error }
}
```

### 获取用户投票

```javascript
async getUserSurveys(userId, options = {}) {
  const { status = 'active', page = 1, limit = 10 } = options

  const { data, error } = await supabase
    .from('surveys')
    .select(`
      *,
      survey_options (
        id,
        option_text,
        vote_count
      )
    `)
    .eq('creator_id', userId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  return { data, error, success: !error }
}
```

### 获取参与记录

```javascript
async getUserParticipations(userId, options = {}) {
  const { page = 1, limit = 10 } = options

  const { data, error } = await supabase
    .from('survey_participations')
    .select(`
      *,
      surveys (
        id,
        title,
        description,
        cover_image_url
      )
    `)
    .eq('participant_id', userId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  return { data, error, success: !error }
}
```

## ⚠️ 错误处理规范

### 统一错误处理

```javascript
class APIError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = "APIError";
    this.code = code;
    this.details = details;
  }
}

// 错误处理包装器
const handleAPIError = (error) => {
  console.error("API Error:", error);

  if (error.code === "PGRST116") {
    return new APIError("数据不存在", "NOT_FOUND");
  }

  if (error.code === "23505") {
    return new APIError("数据已存在", "DUPLICATE");
  }

  return new APIError(
    error.message || "操作失败",
    error.code || "UNKNOWN_ERROR",
    error.details
  );
};
```

### 网络错误处理

```javascript
const withRetry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // 指数退避
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
};
```

## 📊 性能优化规范

### 查询优化

```javascript
// 使用索引字段查询
const optimizedQuery = supabase
  .from("surveys")
  .select("id, title, created_at") // 只选择需要的字段
  .eq("app_id", APP_CONFIG.APP_ID) // 使用索引字段
  .eq("status", "active") // 使用索引字段
  .order("created_at", { ascending: false })
  .limit(10);
```

### 缓存策略

```javascript
// 简单内存缓存
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

const getCachedData = (key) => {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  cache.delete(key);
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
};
```

## 🔒 安全规范

### 输入验证

```javascript
const validateSurveyData = (data) => {
  const errors = [];

  if (!data.title || data.title.length < 2) {
    errors.push("标题至少需要2个字符");
  }

  if (!data.options || data.options.length < 2) {
    errors.push("至少需要2个选项");
  }

  if (errors.length > 0) {
    throw new APIError("数据验证失败", "VALIDATION_ERROR", errors);
  }
};
```

### 权限验证

```javascript
const requireAuth = async () => {
  const user = await hybridAuthService.getCurrentUser();
  if (!user) {
    throw new APIError("需要登录", "AUTH_REQUIRED");
  }
  return user;
};

const requireOwnership = async (surveyId, userId) => {
  const { data } = await supabase
    .from("surveys")
    .select("creator_id")
    .eq("id", surveyId)
    .single();

  if (data.creator_id !== userId) {
    throw new APIError("权限不足", "PERMISSION_DENIED");
  }
};
```

---

**文档版本**: v1.0.0  
**最后更新**: 2025 年 9 月 7 日  
**维护人员**: API 开发团队

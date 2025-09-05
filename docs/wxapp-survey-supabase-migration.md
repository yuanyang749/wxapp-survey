# 微信小程序投票系统 Supabase 迁移方案

## 📋 项目重构契机

### 技术背景
- **原技术栈**: 微信小程序 + LeanCloud BaaS
- **迁移原因**: LeanCloud 已废弃，需要寻找替代方案
- **目标平台**: Supabase (现代化 BaaS 平台)

### 现有功能分析
当前投票系统包含以下核心功能：
- 用户认证 (微信登录)
- 创建投票/调查
- 参与投票
- 查看投票结果
- 管理个人投票
- 图片上传功能

## 🎯 重构目标

### 架构升级
从传统私有应用升级为**混合应用架构**：
- **公开功能**: 浏览投票列表、查看公开投票结果 (无需登录)
- **私有功能**: 创建投票、参与投票、管理投票 (需要登录)

### 技术优势
- ✅ 降低用户参与门槛
- ✅ 提高内容曝光度
- ✅ 现代化技术架构
- ✅ 更强的安全性和扩展性
- ✅ 实时功能支持

## 🏗️ 数据库架构设计

### 核心表结构

#### 1. 应用配置表
```sql
CREATE TABLE apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    app_type TEXT DEFAULT 'hybrid' CHECK (app_type IN ('public', 'private', 'hybrid')),
    app_secret TEXT UNIQUE NOT NULL,
    public_routes TEXT[] DEFAULT '{}',
    private_routes TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. 用户资料表
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    app_id TEXT REFERENCES apps(app_id) NOT NULL DEFAULT 'wxapp_survey_2025',
    wx_openid TEXT UNIQUE,
    nickname TEXT,
    avatar_url TEXT,
    created_surveys_count INTEGER DEFAULT 0,
    participated_surveys_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. 投票主表
```sql
CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT REFERENCES apps(app_id) NOT NULL DEFAULT 'wxapp_survey_2025',
    title TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    survey_type TEXT DEFAULT 'single' CHECK (survey_type IN ('single', 'multiple')),
    access_level TEXT DEFAULT 'public' CHECK (access_level IN ('public', 'authenticated', 'owner_only')),
    require_login_to_vote BOOLEAN DEFAULT true,
    end_time TIMESTAMPTZ,
    total_votes INTEGER DEFAULT 0,
    total_participants INTEGER DEFAULT 0,
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. 投票选项表
```sql
CREATE TABLE survey_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_image_url TEXT,
    vote_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. 参与记录表
```sql
CREATE TABLE survey_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    selected_option_ids UUID[] NOT NULL,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(survey_id, participant_id)
);
```

## 🔐 安全策略 (RLS)

### 分级访问控制
```sql
-- 投票表分级访问策略
CREATE POLICY "surveys_public_read" ON surveys
    FOR SELECT USING (
        status = 'active' AND (
            access_level = 'public' OR
            (access_level = 'authenticated' AND auth.uid() IS NOT NULL) OR
            (access_level = 'owner_only' AND creator_id = auth.uid())
        )
    );

-- 投票创建策略
CREATE POLICY "surveys_owner_write" ON surveys
    FOR ALL USING (creator_id = auth.uid());
```

## 🔧 混合认证服务

### 应用配置
```javascript
// config/app.js
export const APP_CONFIG = {
    APP_ID: 'wxapp_survey_2025',
    APP_NAME: '微信投票小程序',
    APP_TYPE: 'hybrid',
    
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key',
    
    // 页面访问配置
    PAGE_ACCESS: {
        PUBLIC: [
            'pages/main/index',     // 浏览投票列表
            'pages/result/index',   // 查看投票结果
            'pages/about/index'     // 关于页面
        ],
        PRIVATE: [
            'pages/index/index',        // 创建投票
            'pages/mine/index',         // 个人中心
            'pages/mySurvey/index',     // 我的投票
            'pages/participate/index',  // 参与记录
            'pages/edit/index'          // 编辑投票
        ]
    }
}
```

### 认证服务类
```javascript
// services/HybridAuthService.js
class HybridAuthService {
    constructor() {
        this.supabase = createClient(
            APP_CONFIG.SUPABASE_URL,
            APP_CONFIG.SUPABASE_ANON_KEY
        )
    }

    // 微信登录
    async wxLogin() {
        const wxLoginResult = await this.getWxLoginCode()
        const wxUserInfo = await this.getWxUserInfo()
        
        const { data, error } = await this.supabase.functions.invoke('wechat-auth', {
            body: {
                code: wxLoginResult.code,
                userInfo: wxUserInfo,
                appId: APP_CONFIG.APP_ID
            }
        })
        
        if (!error) {
            await this.supabase.auth.setSession(data.session)
            this.currentUser = data.user
        }
        
        return { success: !error, user: data?.user, error }
    }

    // 获取公开投票列表
    async getPublicSurveys(page = 1, limit = 10) {
        const offset = (page - 1) * limit
        
        const { data, error } = await this.supabase
            .from('surveys')
            .select(`
                id, title, description, cover_image_url,
                survey_type, access_level, total_votes,
                total_participants, end_time, created_at,
                profiles!creator_id (nickname, avatar_url)
            `)
            .eq('status', 'active')
            .in('access_level', ['public', 'authenticated'])
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        return { data, error }
    }

    // 参与投票
    async participateInSurvey(surveyId, selectedOptionIds) {
        const user = await this.getCurrentUser()
        if (!user) throw new Error('需要登录才能参与投票')

        const { data, error } = await this.supabase.rpc('participate_in_survey', {
            p_survey_id: surveyId,
            p_participant_id: user.id,
            p_selected_option_ids: selectedOptionIds
        })

        return { data, error }
    }
}
```

## 📱 页面重构方案

### 主页改造 (支持混合访问)
```javascript
// pages/main/index.js
Page({
    data: {
        surveys: [],
        user: null,
        loading: true
    },

    async onLoad() {
        await this.checkUserStatus()
        await this.loadSurveys()
    },

    async loadSurveys() {
        const { data, error } = await hybridAuthService.getPublicSurveys()
        if (!error) {
            this.setData({ surveys: data || [], loading: false })
        }
    },

    async onTapSurvey(e) {
        const survey = e.currentTarget.dataset.survey
        
        // 检查访问权限
        if (survey.access_level === 'authenticated' && !this.data.user) {
            this.showLoginPrompt('查看此投票需要登录')
            return
        }

        wx.navigateTo({
            url: `/pages/result/index?surveyId=${survey.id}`
        })
    },

    async handleLogin() {
        const result = await hybridAuthService.wxLogin()
        if (result.success) {
            this.setData({ user: result.user })
        }
    }
})
```

## 🚀 Edge Functions

### 微信认证函数
```typescript
// supabase/functions/wechat-auth/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { code, userInfo, appId } = await req.json()

  // 1. 验证微信 code
  const wxResponse = await fetch(
    `https://api.weixin.qq.com/sns/jscode2session?appid=${Deno.env.get('WX_APP_ID')}&secret=${Deno.env.get('WX_APP_SECRET')}&js_code=${code}&grant_type=authorization_code`
  )

  const wxData = await wxResponse.json()

  // 2. 创建 Supabase 客户端
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 3. 查找或创建用户
  let { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('wx_openid', wxData.openid)
    .eq('app_id', appId)
    .single()

  // 4. 处理用户创建/更新逻辑
  // 5. 生成并返回 JWT token

  return new Response(JSON.stringify({ session, user }))
})
```

## 📊 文件存储方案

### Supabase Storage 配置
```javascript
// 图片上传功能
async function uploadSurveyImage(filePath) {
    const fileData = wx.getFileSystemManager().readFileSync(filePath)
    const fileName = `survey-images/${Date.now()}.jpg`

    const { data, error } = await supabase.storage
        .from('survey-files')
        .upload(fileName, fileData, {
            contentType: 'image/jpeg'
        })

    if (error) throw error

    // 获取公开访问 URL
    const { data: { publicUrl } } = supabase.storage
        .from('survey-files')
        .getPublicUrl(fileName)

    return publicUrl
}
```

## 🗄️ 现有项目状态

### UX-Learning-Project 现状
当前 Supabase 项目已包含基础多应用架构：
- ✅ `apps` 表已存在，包含 `wxapp_survey_2025` 应用配置
- ✅ `profiles` 表已配置，支持多应用用户管理
- ✅ `public_data` 表支持分级访问控制
- ✅ `security_logs` 表用于安全审计
- ✅ RLS 策略已启用

### 需要清理的测试数据
- 现有的测试投票数据
- 示例用户配置
- 测试应用配置

## 📅 实施计划

### 阶段 1: 基础架构搭建 (1-2 周)
- [ ] 清理现有测试数据
- [ ] 创建投票系统专用表结构
- [ ] 配置投票相关 RLS 安全策略
- [ ] 开发微信认证 Edge Function
- [ ] 配置 Storage Bucket

### 阶段 2: 核心功能迁移 (2-3 周)
- [ ] 实现 HybridAuthService 认证服务
- [ ] 重构主页支持混合访问
- [ ] 迁移投票创建和管理功能
- [ ] 实现文件上传功能
- [ ] 开发投票参与逻辑

### 阶段 3: 用户体验优化 (1-2 周)
- [ ] 开发通用组件 (投票卡片、登录提示等)
- [ ] 实现实时投票结果更新
- [ ] 优化加载状态和错误处理
- [ ] 添加分享功能
- [ ] 完善页面访问控制

### 阶段 4: 测试与发布 (1 周)
- [ ] 全面功能测试
- [ ] 性能优化
- [ ] 小程序域名白名单配置
- [ ] 小程序审核和发布

## 🎯 预期收益

1. **用户体验提升**: 降低参与门槛，支持匿名浏览
2. **技术架构现代化**: 基于 PostgreSQL 的强大数据库
3. **功能扩展性强**: 支持多种投票类型和访问控制
4. **开发效率提升**: 清晰的代码结构和组件化开发
5. **安全性增强**: 现代化的认证和权限控制机制

---

**项目状态**: 准备开始实施
**目标完成时间**: 5-8 周
**技术风险**: 低 (方案成熟，有完整架构指导)
**当前环境**: UX-Learning-Project (已有基础架构)

---
type: "always_apply"
description: "Example description"
---

# Supabase 数据库规范文档

**项目**: wxapp-survey  
**Supabase 项目**: UXLearningProject  
**创建时间**: 2025 年 9 月 7 日

## 📊 数据库架构规范

### 核心表结构

#### 1. apps - 应用配置表

```sql
-- 应用基础信息
CREATE TABLE apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    app_type TEXT DEFAULT 'hybrid' CHECK (app_type IN ('public', 'private', 'hybrid')),
    app_secret TEXT UNIQUE NOT NULL,
    allowed_domains TEXT[],
    public_routes TEXT[],
    private_routes TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. profiles - 用户资料表

```sql
-- 用户详细信息
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    app_id TEXT REFERENCES apps(app_id) NOT NULL,
    email TEXT,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    metadata JSONB DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. surveys - 投票主表

```sql
-- 投票基础信息
CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT REFERENCES apps(app_id) NOT NULL DEFAULT 'wxapp_survey_2025',
    title TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    survey_type TEXT DEFAULT 'single' CHECK (survey_type IN ('single', 'multiple')),
    max_selections INTEGER DEFAULT 1,
    access_level TEXT DEFAULT 'public' CHECK (access_level IN ('public', 'authenticated', 'owner_only')),
    require_login_to_vote BOOLEAN DEFAULT true,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    total_votes INTEGER DEFAULT 0,
    total_participants INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'ended', 'deleted')),
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. survey_options - 投票选项表

```sql
-- 投票选项详情
CREATE TABLE survey_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_image_url TEXT,
    description TEXT,
    vote_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. survey_participations - 参与记录表

```sql
-- 用户参与记录
CREATE TABLE survey_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    selected_option_ids UUID[] NOT NULL,
    participant_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(survey_id, participant_id)
);
```

### 索引优化规范

#### 必需索引

```sql
-- 性能优化索引
CREATE INDEX idx_surveys_app_id_status ON surveys(app_id, status);
CREATE INDEX idx_surveys_creator_id ON surveys(creator_id);
CREATE INDEX idx_surveys_featured_created ON surveys(is_featured DESC, created_at DESC);
CREATE INDEX idx_survey_options_survey_id ON survey_options(survey_id, sort_order);
CREATE INDEX idx_survey_participations_survey_id ON survey_participations(survey_id);
CREATE INDEX idx_profiles_app_id ON profiles(app_id);
```

## 🔐 RLS 安全策略

### 分级访问控制策略

#### surveys 表策略

```sql
-- 公开读取策略
CREATE POLICY "surveys_public_read" ON surveys
    FOR SELECT USING (
        status = 'active' AND (
            access_level = 'public' OR
            (access_level = 'authenticated' AND auth.uid() IS NOT NULL) OR
            (access_level = 'owner_only' AND creator_id = auth.uid())
        )
    );

-- 创建者管理策略
CREATE POLICY "surveys_owner_manage" ON surveys
    FOR ALL USING (creator_id = auth.uid());

-- 应用隔离策略
CREATE POLICY "surveys_app_isolation" ON surveys
    FOR ALL USING (app_id = current_setting('app.current_app_id', true));
```

#### profiles 表策略

```sql
-- 用户自己的资料
CREATE POLICY "profiles_own_data" ON profiles
    FOR ALL USING (id = auth.uid());

-- 公开资料查看
CREATE POLICY "profiles_public_read" ON profiles
    FOR SELECT USING (true);
```

#### survey_participations 表策略

```sql
-- 参与者查看自己的记录
CREATE POLICY "participations_own_data" ON survey_participations
    FOR SELECT USING (participant_id = auth.uid());

-- 投票创建者查看参与记录
CREATE POLICY "participations_creator_read" ON survey_participations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM surveys
            WHERE surveys.id = survey_participations.survey_id
            AND surveys.creator_id = auth.uid()
        )
    );

-- 参与投票
CREATE POLICY "participations_create" ON survey_participations
    FOR INSERT WITH CHECK (participant_id = auth.uid());
```

## 🔧 存储过程和函数

### 投票参与存储过程

```sql
CREATE OR REPLACE FUNCTION participate_in_survey(
    p_survey_id UUID,
    p_participant_id UUID,
    p_selected_option_ids UUID[]
) RETURNS JSON AS $$
DECLARE
    v_survey surveys%ROWTYPE;
    v_participation_exists BOOLEAN;
    v_result JSON;
BEGIN
    -- 检查投票是否存在且有效
    SELECT * INTO v_survey FROM surveys
    WHERE id = p_survey_id AND status = 'active';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', '投票不存在或已结束');
    END IF;

    -- 检查是否已经参与
    SELECT EXISTS(
        SELECT 1 FROM survey_participations
        WHERE survey_id = p_survey_id AND participant_id = p_participant_id
    ) INTO v_participation_exists;

    IF v_participation_exists THEN
        RETURN json_build_object('success', false, 'error', '您已经参与过此投票');
    END IF;

    -- 插入参与记录
    INSERT INTO survey_participations (
        survey_id, participant_id, selected_option_ids
    ) VALUES (
        p_survey_id, p_participant_id, p_selected_option_ids
    );

    -- 更新选项投票数
    UPDATE survey_options
    SET vote_count = vote_count + 1
    WHERE id = ANY(p_selected_option_ids);

    -- 更新投票统计
    UPDATE surveys
    SET
        total_votes = total_votes + array_length(p_selected_option_ids, 1),
        total_participants = total_participants + 1
    WHERE id = p_survey_id;

    RETURN json_build_object('success', true, 'message', '投票成功');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 投票统计视图

```sql
CREATE OR REPLACE VIEW public_surveys AS
SELECT
    s.id,
    s.title,
    s.description,
    s.cover_image_url,
    s.survey_type,
    s.access_level,
    s.total_votes,
    s.total_participants,
    s.view_count,
    s.is_featured,
    s.created_at,
    s.end_time,
    p.full_name as creator_name,
    p.avatar_url as creator_avatar,
    COALESCE(
        json_agg(
            json_build_object(
                'id', so.id,
                'text', so.option_text,
                'image_url', so.option_image_url,
                'vote_count', so.vote_count,
                'sort_order', so.sort_order
            ) ORDER BY so.sort_order
        ) FILTER (WHERE so.id IS NOT NULL),
        '[]'::json
    ) as options
FROM surveys s
LEFT JOIN profiles p ON s.creator_id = p.id
LEFT JOIN survey_options so ON s.id = so.survey_id
WHERE s.status = 'active'
GROUP BY s.id, p.full_name, p.avatar_url
ORDER BY s.is_featured DESC, s.created_at DESC;
```

## 📁 Storage 存储规范

### Bucket 配置

```sql
-- 创建存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('survey-files', 'survey-files', true);
```

### Storage 策略

```sql
-- 上传策略：仅认证用户可上传
CREATE POLICY "survey_files_upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'survey-files'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 读取策略：所有人可读取
CREATE POLICY "survey_files_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'survey-files');

-- 删除策略：仅文件所有者可删除
CREATE POLICY "survey_files_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'survey-files'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
```

### 文件路径规范

```
survey-files/
├── {user_id}/
│   ├── covers/           # 投票封面图
│   │   └── {survey_id}.jpg
│   ├── options/          # 选项图片
│   │   └── {option_id}.jpg
│   └── temp/             # 临时文件
│       └── {timestamp}.jpg
```

## 🔍 查询优化规范

### 常用查询模式

```sql
-- 获取公开投票列表（分页）
SELECT * FROM public_surveys
WHERE access_level IN ('public', 'authenticated')
ORDER BY is_featured DESC, created_at DESC
LIMIT 10 OFFSET 0;

-- 获取用户创建的投票
SELECT * FROM surveys
WHERE creator_id = $1 AND status != 'deleted'
ORDER BY created_at DESC;

-- 获取用户参与的投票
SELECT s.*, sp.created_at as participated_at
FROM surveys s
JOIN survey_participations sp ON s.id = sp.survey_id
WHERE sp.participant_id = $1
ORDER BY sp.created_at DESC;
```

### 性能监控

```sql
-- 慢查询监控
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;

-- 表大小监控
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🚨 数据维护规范

### 定期清理任务

```sql
-- 清理过期的临时文件（7天前）
DELETE FROM storage.objects
WHERE bucket_id = 'survey-files'
AND name LIKE '%/temp/%'
AND created_at < NOW() - INTERVAL '7 days';

-- 清理已删除投票的相关数据（30天后）
DELETE FROM surveys
WHERE status = 'deleted'
AND updated_at < NOW() - INTERVAL '30 days';

-- 清理旧的安全日志（90天前）
DELETE FROM security_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

### 数据备份策略

- **自动备份**: Supabase 平台自动备份
- **手动备份**: 重要操作前手动创建快照
- **恢复测试**: 每月测试备份恢复流程

---

**文档版本**: v1.0.0  
**最后更新**: 2025 年 9 月 7 日  
**维护人员**: 数据库管理员

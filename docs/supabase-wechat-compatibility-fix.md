# Supabase 微信小程序兼容性问题修复

## 📋 问题描述

在微信小程序中使用 `@supabase/supabase-js` 时遇到以下错误：

```
Error: module 'miniprogram_npm/@supabase/node-fetch/stream.js' is not defined, require args is 'stream'
```

## 🔍 问题根因分析

1. **Node.js 模块依赖问题**: `@supabase/supabase-js` 包依赖了 Node.js 的核心模块（如 `stream`、`http`、`url`、`zlib` 等）
2. **微信小程序环境限制**: 微信小程序的 JavaScript 运行环境不支持 Node.js 核心模块
3. **构建工具无法解决**: 即使通过微信开发者工具的 npm 构建功能，也无法解决这些底层依赖问题
4. **Phoenix 语法兼容性**: `phoenix` 包使用了 `catch {` 语法，微信小程序不支持这种省略参数的 catch 语法

## ✅ 解决方案

使用专门为微信小程序优化的 Supabase 客户端：`supabase-wechat-stable-v2`

### 1. 更新依赖包

```bash
# 卸载原有包
npm uninstall @supabase/supabase-js

# 安装微信小程序专用包
npm install supabase-wechat-stable-v2
```

### 2. 更新配置文件

修改 `config/supabase.js`：

```javascript
// 修改前
const { createClient } = require('@supabase/supabase-js')

// 修改后
const { createClient } = require('supabase-wechat-stable-v2')
```

### 3. 简化客户端配置

由于 `supabase-wechat-stable-v2` 已经为微信小程序环境做了优化，可以移除自定义的 fetch 实现：

```javascript
const supabase = createClient(
  APP_CONFIG.SUPABASE_URL,
  APP_CONFIG.SUPABASE_ANON_KEY,
  {
    auth: {
      storage: {
        getItem: (key) => wx.getStorageSync(key) || null,
        setItem: (key, value) => wx.setStorageSync(key, value),
        removeItem: (key) => wx.removeStorageSync(key)
      },
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'X-Client-Info': 'wxapp-survey-2025'
      }
    }
  }
)
```

### 4. 修复 Phoenix 语法兼容性问题

由于 `supabase-wechat-stable-v2` 依赖的 `phoenix` 包使用了微信小程序不支持的语法，需要修复：

```bash
# 运行修复脚本
npm run fix-phoenix
```

### 5. 重新构建 npm

1. 删除旧的 `miniprogram_npm` 目录
2. 在微信开发者工具中：`工具` → `构建 npm`

## 🎯 优势对比

| 特性 | @supabase/supabase-js | supabase-wechat-stable-v2 |
|------|----------------------|---------------------------|
| 微信小程序兼容性 | ❌ 不兼容 | ✅ 完全兼容 |
| Node.js 模块依赖 | ❌ 有依赖 | ✅ 无依赖 |
| 包大小 | 较大 | 较小 |
| 功能完整性 | 完整 | 核心功能完整 |
| 维护状态 | 官方维护 | 社区维护 |

## 📚 参考资源

- [supabase-wechat-stable-v2 GitHub](https://github.com/MemFire-Cloud/supabase-wechat-stable-v2)
- [微信小程序 npm 支持文档](https://developers.weixin.qq.com/miniprogram/dev/devtools/npm.html)
- [Supabase 官方文档](https://supabase.com/docs)

## 🔧 自动修复脚本

为了解决 Phoenix 语法兼容性问题，项目中包含了自动修复脚本：

- **脚本位置**: `scripts/fix-phoenix-syntax.js`
- **自动执行**: 每次 `npm install` 后自动运行（通过 `postinstall` 钩子）
- **手动执行**: `npm run fix-phoenix`

脚本功能：
- 检测 `phoenix.cjs.js` 文件中的 `} catch {` 语法
- 自动替换为 `} catch (e) {` 以兼容微信小程序环境

## 🔧 ES6 模块语法修复

除了 Supabase 兼容性问题，还修复了项目中的 ES6 模块语法问题：

### 修复的文件：
- `utils/LoadingManager.js`: `export default` → `module.exports`
- `utils/NavigationHelper.js`: `export default` → `module.exports`
- `utils/EventBus.js`: `export default` → `module.exports`
- `utils/AnimationHelper.js`: `export default` → `module.exports`
- `services/SurveyService.js`: `import/export` → `require/module.exports`
- `services/FileUploadService.js`: `import/export` → `require/module.exports`

### WXSS 样式修复：
- `components/empty-state/empty-state.wxss`: 移除了不被支持的属性选择器
  - `[data-type="error"]` → `.error`
  - `[data-type="network"]` → `.network`
  - `[data-type="loading"]` → `.loading`

## ✅ 修复结果

- ✅ 解决了 Node.js 模块依赖错误
- ✅ 修复了 Phoenix 语法兼容性问题
- ✅ 修复了 ES6 模块语法兼容性问题
- ✅ 修复了 WXSS 样式选择器问题
- ✅ 保持了 Supabase 的核心功能
- ✅ 减少了包大小和复杂度
- ✅ 提供了更好的微信小程序兼容性
- ✅ 添加了自动修复机制，避免重复问题

---

**修复时间**: 2025-09-05
**修复版本**: supabase-wechat-stable-v2@2.2.0

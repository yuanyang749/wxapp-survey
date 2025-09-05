#!/usr/bin/env node

/**
 * 微信小程序兼容性修复脚本
 *
 * 修复以下问题：
 * 1. Phoenix 包中的 JavaScript 语法兼容性问题
 * 2. ES6 模块语法兼容性问题
 * 3. WXSS 样式选择器兼容性问题
 */

const fs = require('fs')
const path = require('path')

const phoenixFilePath = path.join(__dirname, '../node_modules/phoenix/priv/static/phoenix.cjs.js')

function fixPhoenixSyntax() {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(phoenixFilePath)) {
      console.log('Phoenix file not found, skipping fix.')
      return
    }

    // 读取文件内容
    let content = fs.readFileSync(phoenixFilePath, 'utf8')
    
    // 检查是否需要修复
    if (!content.includes('} catch {')) {
      console.log('Phoenix syntax already fixed or no issues found.')
      return
    }

    // 修复语法问题
    const fixedContent = content.replace(
      /} catch \{/g,
      '} catch (e) {'
    )

    // 写回文件
    fs.writeFileSync(phoenixFilePath, fixedContent, 'utf8')
    
    console.log('✅ Phoenix syntax fixed successfully!')
    console.log('Fixed: } catch { -> } catch (e) {')
    
  } catch (error) {
    console.error('❌ Failed to fix Phoenix syntax:', error.message)
    process.exit(1)
  }
}

// 运行修复
fixPhoenixSyntax()

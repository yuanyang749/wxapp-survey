/**
 * 动画辅助工具
 * 提供页面内元素动画和交互反馈效果
 */

class AnimationHelper {
  constructor() {
    this.animations = new Map()
  }

  /**
   * 创建淡入动画
   * @param {number} duration 动画时长（毫秒）
   * @param {string} timingFunction 时间函数
   */
  createFadeIn(duration = 300, timingFunction = 'ease') {
    const animation = wx.createAnimation({
      duration,
      timingFunction,
      delay: 0,
      transformOrigin: '50% 50%'
    })
    
    return animation.opacity(1).step()
  }

  /**
   * 创建淡出动画
   * @param {number} duration 动画时长（毫秒）
   * @param {string} timingFunction 时间函数
   */
  createFadeOut(duration = 300, timingFunction = 'ease') {
    const animation = wx.createAnimation({
      duration,
      timingFunction,
      delay: 0,
      transformOrigin: '50% 50%'
    })
    
    return animation.opacity(0).step()
  }

  /**
   * 创建滑入动画（从右侧）
   * @param {number} duration 动画时长（毫秒）
   * @param {string} timingFunction 时间函数
   */
  createSlideInRight(duration = 300, timingFunction = 'ease-out') {
    const animation = wx.createAnimation({
      duration,
      timingFunction,
      delay: 0,
      transformOrigin: '50% 50%'
    })
    
    return animation.translateX(0).opacity(1).step()
  }

  /**
   * 创建滑出动画（向左侧）
   * @param {number} duration 动画时长（毫秒）
   * @param {string} timingFunction 时间函数
   */
  createSlideOutLeft(duration = 300, timingFunction = 'ease-in') {
    const animation = wx.createAnimation({
      duration,
      timingFunction,
      delay: 0,
      transformOrigin: '50% 50%'
    })
    
    return animation.translateX('-100%').opacity(0).step()
  }

  /**
   * 创建缩放动画
   * @param {number} scale 缩放比例
   * @param {number} duration 动画时长（毫秒）
   * @param {string} timingFunction 时间函数
   */
  createScale(scale = 1, duration = 300, timingFunction = 'ease-out') {
    const animation = wx.createAnimation({
      duration,
      timingFunction,
      delay: 0,
      transformOrigin: '50% 50%'
    })
    
    return animation.scale(scale).step()
  }

  /**
   * 创建弹跳动画
   * @param {number} duration 动画时长（毫秒）
   */
  createBounce(duration = 600) {
    const animation = wx.createAnimation({
      duration,
      timingFunction: 'ease-out',
      delay: 0,
      transformOrigin: '50% 50%'
    })
    
    return animation
      .scale(1.1).step({ duration: duration * 0.3 })
      .scale(0.95).step({ duration: duration * 0.3 })
      .scale(1).step({ duration: duration * 0.4 })
  }

  /**
   * 创建摇摆动画
   * @param {number} duration 动画时长（毫秒）
   */
  createShake(duration = 500) {
    const animation = wx.createAnimation({
      duration,
      timingFunction: 'ease-in-out',
      delay: 0,
      transformOrigin: '50% 50%'
    })
    
    return animation
      .translateX(10).step({ duration: duration * 0.1 })
      .translateX(-10).step({ duration: duration * 0.1 })
      .translateX(8).step({ duration: duration * 0.1 })
      .translateX(-8).step({ duration: duration * 0.1 })
      .translateX(5).step({ duration: duration * 0.1 })
      .translateX(-5).step({ duration: duration * 0.1 })
      .translateX(2).step({ duration: duration * 0.1 })
      .translateX(-2).step({ duration: duration * 0.1 })
      .translateX(0).step({ duration: duration * 0.2 })
  }

  /**
   * 创建旋转动画
   * @param {number} rotate 旋转角度
   * @param {number} duration 动画时长（毫秒）
   * @param {string} timingFunction 时间函数
   */
  createRotate(rotate = 360, duration = 1000, timingFunction = 'linear') {
    const animation = wx.createAnimation({
      duration,
      timingFunction,
      delay: 0,
      transformOrigin: '50% 50%'
    })
    
    return animation.rotate(rotate).step()
  }

  /**
   * 创建心跳动画
   * @param {number} duration 动画时长（毫秒）
   */
  createHeartbeat(duration = 1000) {
    const animation = wx.createAnimation({
      duration,
      timingFunction: 'ease-in-out',
      delay: 0,
      transformOrigin: '50% 50%'
    })
    
    return animation
      .scale(1.1).step({ duration: duration * 0.3 })
      .scale(1).step({ duration: duration * 0.7 })
  }



  /**
   * 按钮点击反馈动画
   * @param {object} page 页面实例
   * @param {string} elementKey 元素数据键名
   */
  buttonClickFeedback(page, elementKey = 'buttonAnimation') {
    const animation = this.createScale(0.95, 150, 'ease-out')
    
    page.setData({
      [elementKey]: animation.export()
    })
    
    setTimeout(() => {
      const resetAnimation = this.createScale(1, 150, 'ease-out')
      page.setData({
        [elementKey]: resetAnimation.export()
      })
    }, 150)
  }

  /**
   * 列表项进入动画
   * @param {object} page 页面实例
   * @param {array} items 列表项
   * @param {string} dataKey 数据键名
   */
  listItemsEnterAnimation(page, items, dataKey = 'listItems') {
    const animatedItems = items.map((item, index) => ({
      ...item,
      animationDelay: index * 100,
      animation: null
    }))
    
    page.setData({
      [dataKey]: animatedItems
    })
    
    // 逐个显示列表项
    animatedItems.forEach((item, index) => {
      setTimeout(() => {
        const animation = this.createFadeIn(300, 'ease-out')
        const updatedItems = [...page.data[dataKey]]
        updatedItems[index] = {
          ...updatedItems[index],
          animation: animation.export()
        }
        
        page.setData({
          [dataKey]: updatedItems
        })
      }, item.animationDelay)
    })
  }

  /**
   * 错误提示动画
   * @param {object} page 页面实例
   * @param {string} elementKey 元素数据键名
   */
  errorShakeAnimation(page, elementKey = 'errorAnimation') {
    const animation = this.createShake(500)
    
    page.setData({
      [elementKey]: animation.export()
    })
    
    setTimeout(() => {
      page.setData({
        [elementKey]: null
      })
    }, 500)
  }

  /**
   * 成功提示动画
   * @param {object} page 页面实例
   * @param {string} elementKey 元素数据键名
   */
  successBounceAnimation(page, elementKey = 'successAnimation') {
    const animation = this.createBounce(600)
    
    page.setData({
      [elementKey]: animation.export()
    })
    
    setTimeout(() => {
      page.setData({
        [elementKey]: null
      })
    }, 600)
  }
}

// 创建单例实例
const animationHelper = new AnimationHelper()

module.exports = animationHelper

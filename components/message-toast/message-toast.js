/**
 * 消息提示组件
 * 提供统一的成功、错误、警告、信息提示
 */

Component({
  properties: {
    // 是否显示
    show: {
      type: Boolean,
      value: false
    },
    
    // 消息类型
    type: {
      type: String,
      value: 'info' // 'success' | 'error' | 'warning' | 'info'
    },
    
    // 消息内容
    message: {
      type: String,
      value: ''
    },
    
    // 显示时长（毫秒）
    duration: {
      type: Number,
      value: 3000
    },
    
    // 位置
    position: {
      type: String,
      value: 'top' // 'top' | 'center' | 'bottom'
    },
    
    // 是否可关闭
    closable: {
      type: Boolean,
      value: false
    },
    
    // 自定义图标
    icon: {
      type: String,
      value: ''
    },
    
    // 是否显示图标
    showIcon: {
      type: Boolean,
      value: true
    }
  },

  data: {
    // 内部显示状态
    visible: false,
    // 动画状态
    animationData: null,
    // 定时器
    timer: null,
    // 预设图标
    icons: {
      success: '/images/icon-sq.png',
      error: '/images/icon-del.png',
      warning: '/images/icon-watch.png',
      info: '/images/icon-more.png'
    }
  },

  observers: {
    'show': function(show) {
      if (show) {
        this.showToast()
      } else {
        this.hideToast()
      }
    }
  },

  lifetimes: {
    detached() {
      this.clearTimer()
    }
  },

  methods: {
    /**
     * 显示提示
     */
    showToast() {
      this.clearTimer()
      
      this.setData({ visible: true })
      
      // 进入动画
      setTimeout(() => {
        const animation = this.createEnterAnimation()
        this.setData({ animationData: animation.export() })
      }, 50)
      
      // 自动隐藏
      if (this.data.duration > 0) {
        this.data.timer = setTimeout(() => {
          this.hideToast()
        }, this.data.duration)
      }
    },

    /**
     * 隐藏提示
     */
    hideToast() {
      this.clearTimer()
      
      // 退出动画
      const animation = this.createExitAnimation()
      this.setData({ animationData: animation.export() })
      
      setTimeout(() => {
        this.setData({ visible: false })
        this.triggerEvent('close')
      }, 300)
    },

    /**
     * 创建进入动画
     */
    createEnterAnimation() {
      const animation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease-out'
      })
      
      const { position } = this.data
      
      switch (position) {
        case 'top':
          return animation.translateY(0).opacity(1).step()
        case 'center':
          return animation.scale(1).opacity(1).step()
        case 'bottom':
          return animation.translateY(0).opacity(1).step()
        default:
          return animation.opacity(1).step()
      }
    },

    /**
     * 创建退出动画
     */
    createExitAnimation() {
      const animation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease-in'
      })
      
      const { position } = this.data
      
      switch (position) {
        case 'top':
          return animation.translateY('-100%').opacity(0).step()
        case 'center':
          return animation.scale(0.8).opacity(0).step()
        case 'bottom':
          return animation.translateY('100%').opacity(0).step()
        default:
          return animation.opacity(0).step()
      }
    },

    /**
     * 清除定时器
     */
    clearTimer() {
      if (this.data.timer) {
        clearTimeout(this.data.timer)
        this.setData({ timer: null })
      }
    },

    /**
     * 关闭按钮点击
     */
    onCloseTap() {
      this.hideToast()
    },

    /**
     * 获取图标路径
     */
    getIconSrc() {
      const { icon, type, icons } = this.data
      return icon || icons[type] || icons.info
    },

    /**
     * 获取容器样式类
     */
    getContainerClass() {
      const { type, position } = this.data
      return `message-toast message-toast-${type} message-toast-${position}`
    },

    /**
     * 获取初始样式
     */
    getInitialStyle() {
      const { position } = this.data
      
      switch (position) {
        case 'top':
          return 'transform: translateY(-100%); opacity: 0;'
        case 'center':
          return 'transform: scale(0.8); opacity: 0;'
        case 'bottom':
          return 'transform: translateY(100%); opacity: 0;'
        default:
          return 'opacity: 0;'
      }
    }
  }
})

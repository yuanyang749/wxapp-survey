/**
 * 交互式按钮组件
 * 提供丰富的点击反馈和动画效果
 */

Component({
  properties: {
    // 按钮文本
    text: {
      type: String,
      value: '按钮'
    },
    
    // 按钮类型
    type: {
      type: String,
      value: 'primary' // 'primary' | 'secondary' | 'ghost' | 'danger'
    },
    
    // 按钮尺寸
    size: {
      type: String,
      value: 'medium' // 'small' | 'medium' | 'large'
    },
    
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    
    // 是否加载中
    loading: {
      type: Boolean,
      value: false
    },
    
    // 加载文本
    loadingText: {
      type: String,
      value: '加载中...'
    },
    
    // 是否圆角
    round: {
      type: Boolean,
      value: false
    },
    
    // 是否块级按钮
    block: {
      type: Boolean,
      value: false
    },
    
    // 图标
    icon: {
      type: String,
      value: ''
    },
    
    // 图标位置
    iconPosition: {
      type: String,
      value: 'left' // 'left' | 'right'
    },
    
    // 点击反馈类型
    feedback: {
      type: String,
      value: 'scale' // 'scale' | 'bounce' | 'ripple' | 'none'
    },
    
    // 自定义样式类
    customClass: {
      type: String,
      value: ''
    }
  },

  data: {
    // 动画状态
    animationData: null,
    isPressed: false,
    ripples: []
  },

  methods: {
    /**
     * 按钮点击处理
     */
    onButtonTap(e) {
      if (this.data.disabled || this.data.loading) {
        return
      }

      // 执行点击反馈动画
      this.performFeedback(e)
      
      // 触发点击事件
      this.triggerEvent('tap', {
        type: this.data.type,
        size: this.data.size
      })
    },

    /**
     * 按钮按下
     */
    onButtonTouchStart(e) {
      if (this.data.disabled || this.data.loading) {
        return
      }

      this.setData({ isPressed: true })
      
      if (this.data.feedback === 'ripple') {
        this.createRipple(e)
      }
    },

    /**
     * 按钮释放
     */
    onButtonTouchEnd() {
      this.setData({ isPressed: false })
    },

    /**
     * 执行反馈动画
     */
    performFeedback(e) {
      const { feedback } = this.data
      
      switch (feedback) {
        case 'scale':
          this.scaleAnimation()
          break
        case 'bounce':
          this.bounceAnimation()
          break
        case 'ripple':
          // 涟漪效果在touchstart中处理
          break
        default:
          break
      }
    },

    /**
     * 缩放动画
     */
    scaleAnimation() {
      const animation = wx.createAnimation({
        duration: 150,
        timingFunction: 'ease-out'
      })
      
      animation.scale(0.95).step()
      this.setData({ animationData: animation.export() })
      
      setTimeout(() => {
        animation.scale(1).step()
        this.setData({ animationData: animation.export() })
      }, 150)
    },

    /**
     * 弹跳动画
     */
    bounceAnimation() {
      const animation = wx.createAnimation({
        duration: 600,
        timingFunction: 'ease-out'
      })
      
      animation.scale(1.1).step({ duration: 200 })
      animation.scale(0.95).step({ duration: 200 })
      animation.scale(1).step({ duration: 200 })
      
      this.setData({ animationData: animation.export() })
    },

    /**
     * 创建涟漪效果
     */
    createRipple(e) {
      const { touches } = e
      if (!touches || touches.length === 0) return
      
      const touch = touches[0]
      const rippleId = Date.now()
      
      // 获取按钮尺寸和位置
      const query = this.createSelectorQuery()
      query.select('.interactive-button').boundingClientRect((rect) => {
        if (!rect) return
        
        const ripple = {
          id: rippleId,
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
          size: Math.max(rect.width, rect.height) * 2
        }
        
        const ripples = [...this.data.ripples, ripple]
        this.setData({ ripples })
        
        // 动画结束后移除涟漪
        setTimeout(() => {
          const updatedRipples = this.data.ripples.filter(r => r.id !== rippleId)
          this.setData({ ripples: updatedRipples })
        }, 600)
      }).exec()
    },

    /**
     * 获取按钮样式类
     */
    getButtonClass() {
      const { type, size, disabled, loading, round, block, customClass } = this.data
      
      let classes = ['interactive-button']
      
      classes.push(`button-${type}`)
      classes.push(`button-${size}`)
      
      if (disabled) classes.push('button-disabled')
      if (loading) classes.push('button-loading')
      if (round) classes.push('button-round')
      if (block) classes.push('button-block')
      if (customClass) classes.push(customClass)
      
      return classes.join(' ')
    },

    /**
     * 获取图标样式类
     */
    getIconClass() {
      const { size, iconPosition } = this.data
      return `button-icon button-icon-${size} button-icon-${iconPosition}`
    }
  }
})

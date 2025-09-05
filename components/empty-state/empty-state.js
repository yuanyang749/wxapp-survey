/**
 * 空状态组件
 * 用于显示无数据、网络错误等状态
 */

Component({
  properties: {
    // 是否显示
    show: {
      type: Boolean,
      value: false
    },
    
    // 空状态类型
    type: {
      type: String,
      value: 'empty' // 'empty' | 'error' | 'network' | 'search' | 'loading'
    },
    
    // 自定义图标
    icon: {
      type: String,
      value: ''
    },
    
    // 主标题
    title: {
      type: String,
      value: ''
    },
    
    // 描述文本
    description: {
      type: String,
      value: ''
    },
    
    // 按钮文本
    buttonText: {
      type: String,
      value: ''
    },
    
    // 是否显示按钮
    showButton: {
      type: Boolean,
      value: false
    },
    
    // 图标大小
    iconSize: {
      type: String,
      value: 'large' // 'small' | 'medium' | 'large'
    }
  },

  data: {
    // 预设的空状态配置
    presets: {
      empty: {
        icon: '/images/youke.png',
        title: '暂无数据',
        description: '这里还没有任何内容'
      },
      error: {
        icon: '/images/icon-del.png',
        title: '出错了',
        description: '页面加载失败，请重试'
      },
      network: {
        icon: '/images/icon-watch.png',
        title: '网络连接失败',
        description: '请检查网络连接后重试'
      },
      search: {
        icon: '/images/icon-more.png',
        title: '没有找到相关内容',
        description: '试试其他关键词吧'
      },
      loading: {
        icon: '/images/icon-sq.png',
        title: '加载中...',
        description: '请稍候'
      }
    }
  },

  computed: {
    // 当前配置
    currentConfig() {
      const preset = this.data.presets[this.data.type] || this.data.presets.empty
      
      return {
        icon: this.data.icon || preset.icon,
        title: this.data.title || preset.title,
        description: this.data.description || preset.description
      }
    }
  },

  methods: {
    /**
     * 按钮点击事件
     */
    onButtonTap() {
      this.triggerEvent('buttonTap', {
        type: this.data.type
      })
    },

    /**
     * 获取图标样式类
     */
    getIconClass() {
      const { iconSize } = this.data
      return `empty-icon empty-icon-${iconSize}`
    }
  }
})

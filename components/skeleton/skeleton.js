/**
 * 骨架屏组件
 * 用于页面加载时的占位显示
 */

Component({
  properties: {
    // 骨架屏类型
    type: {
      type: String,
      value: 'default' // 'default' | 'card' | 'list' | 'profile'
    },
    
    // 是否显示
    show: {
      type: Boolean,
      value: true
    },
    
    // 行数（用于列表类型）
    rows: {
      type: Number,
      value: 3
    },
    
    // 是否显示头像
    avatar: {
      type: Boolean,
      value: false
    },
    
    // 是否显示标题
    title: {
      type: Boolean,
      value: true
    },
    
    // 动画效果
    animated: {
      type: Boolean,
      value: true
    }
  },

  data: {
    // 生成的骨架屏项目
    skeletonItems: []
  },

  lifetimes: {
    attached() {
      this.generateSkeletonItems()
    }
  },

  observers: {
    'type, rows': function() {
      this.generateSkeletonItems()
    }
  },

  methods: {
    /**
     * 生成骨架屏项目
     */
    generateSkeletonItems() {
      const { type, rows } = this.data
      let items = []
      
      switch (type) {
        case 'card':
          items = this.generateCardItems(rows)
          break
        case 'list':
          items = this.generateListItems(rows)
          break
        case 'profile':
          items = this.generateProfileItems()
          break
        default:
          items = this.generateDefaultItems(rows)
      }
      
      this.setData({ skeletonItems: items })
    },

    /**
     * 生成卡片类型骨架屏
     */
    generateCardItems(count) {
      const items = []
      for (let i = 0; i < count; i++) {
        items.push({
          id: i,
          type: 'card',
          hasImage: true,
          hasTitle: true,
          hasContent: true,
          hasFooter: true
        })
      }
      return items
    },

    /**
     * 生成列表类型骨架屏
     */
    generateListItems(count) {
      const items = []
      for (let i = 0; i < count; i++) {
        items.push({
          id: i,
          type: 'list',
          hasAvatar: this.data.avatar,
          hasTitle: this.data.title,
          hasContent: true
        })
      }
      return items
    },

    /**
     * 生成个人资料类型骨架屏
     */
    generateProfileItems() {
      return [{
        id: 0,
        type: 'profile',
        hasAvatar: true,
        hasTitle: true,
        hasStats: true
      }]
    },

    /**
     * 生成默认类型骨架屏
     */
    generateDefaultItems(count) {
      const items = []
      for (let i = 0; i < count; i++) {
        items.push({
          id: i,
          type: 'default',
          hasTitle: this.data.title,
          hasContent: true
        })
      }
      return items
    }
  }
})

/**
 * 图片资源配置
 * 统一管理项目中使用的图片资源链接
 */

// 使用 Unsplash 提供的免费高质量图片
const IMAGE_CONFIG = {
  // 默认头像
  DEFAULT_AVATAR:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",

  // 默认投票封面图片集合
  DEFAULT_COVERS: [
    "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop&crop=center", // 会议讨论
    "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop&crop=center", // 团队合作
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop&crop=center", // 办公场景
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&h=300&fit=crop&crop=center", // 商务会议
    "https://images.unsplash.com/photo-1515378791036-0648a814c963?w=400&h=300&fit=crop&crop=center", // 创意讨论
  ],

  // 轮播图
  BANNERS: [
    "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop&crop=center",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop&crop=center",
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=400&fit=crop&crop=center",
  ],

  // 空状态图片
  EMPTY_STATES: {
    NO_DATA:
      "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=200&h=200&fit=crop&crop=center",
    NO_NETWORK:
      "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=200&h=200&fit=crop&crop=center",
    ERROR:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=200&fit=crop&crop=center",
  },

  // 分类图标（使用本地图标）
  ICONS: {
    LOCK: "/images/icon-sq.png",
    PARTICIPANT: "/images/icon-part.png",
    ADD: "/images/icon-add3.png",
    EDIT: "/images/icon-edit.png",
    DELETE: "/images/icon-del.png",
    SHARE: "/images/icon-share.png",
    MORE: "/images/icon-more.png",
  },
};

/**
 * 获取随机默认封面图片
 * @returns {string} 图片URL
 */
const getRandomCover = () => {
  const covers = IMAGE_CONFIG.DEFAULT_COVERS;
  const randomIndex = Math.floor(Math.random() * covers.length);
  return covers[randomIndex];
};

/**
 * 获取默认头像
 * @returns {string} 头像URL
 */
const getDefaultAvatar = () => {
  return IMAGE_CONFIG.DEFAULT_AVATAR;
};

/**
 * 获取轮播图列表
 * @returns {Array} 轮播图URL数组
 */
const getBanners = () => {
  return IMAGE_CONFIG.BANNERS;
};

/**
 * 获取空状态图片
 * @param {string} type 空状态类型
 * @returns {string} 图片URL
 */
const getEmptyStateImage = (type = "NO_DATA") => {
  return IMAGE_CONFIG.EMPTY_STATES[type] || IMAGE_CONFIG.EMPTY_STATES.NO_DATA;
};

/**
 * 获取图标路径
 * @param {string} iconName 图标名称
 * @returns {string} 图标路径
 */
const getIcon = (iconName) => {
  return IMAGE_CONFIG.ICONS[iconName] || "";
};

module.exports = {
  IMAGE_CONFIG,
  getRandomCover,
  getDefaultAvatar,
  getBanners,
  getEmptyStateImage,
  getIcon,
};

/**
 * 文件上传服务
 * 处理 Supabase Storage 文件上传和管理
 */

const { supabase, SupabaseHelper } = require('../config/supabase.js')
const { APP_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../config/app.js')
const hybridAuthService = require('./HybridAuthService.js')

class FileUploadService {
  
  /**
   * 上传文件到 Supabase Storage
   * @param {string} filePath 微信临时文件路径
   * @param {object} options 上传选项
   * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
   */
  async uploadFile(filePath, options = {}) {
    try {
      const user = hybridAuthService.getCurrentUser()
      if (!user) {
        return { success: false, data: null, error: ERROR_MESSAGES.AUTH.LOGIN_REQUIRED }
      }
      
      const {
        fileType = 'image',
        category = 'survey-covers',
        customFileName = null
      } = options
      
      // 1. 获取文件信息
      const fileInfo = await this.getFileInfo(filePath)
      if (!fileInfo.success) {
        return { success: false, data: null, error: fileInfo.error }
      }
      
      // 2. 验证文件
      const validation = this.validateFile(fileInfo.data, fileType)
      if (!validation.success) {
        return { success: false, data: null, error: validation.error }
      }
      
      // 3. 生成文件名和路径
      const fileName = customFileName || this.generateFileName(fileInfo.data.name, user.id)
      const storagePath = `${user.id}/${category}/${fileName}`
      
      // 4. 读取文件内容
      const fileContent = await this.readFileContent(filePath)
      if (!fileContent.success) {
        return { success: false, data: null, error: fileContent.error }
      }
      
      // 5. 上传到 Supabase Storage
      const { data, error } = await supabase.storage
        .from(APP_CONFIG.FILE_UPLOAD.BUCKET_NAME)
        .upload(storagePath, fileContent.data, {
          contentType: fileInfo.data.type,
          upsert: false
        })
      
      if (error) {
        console.error('File upload failed:', error)
        return { 
          success: false, 
          data: null, 
          error: SupabaseHelper.handleError(error) 
        }
      }
      
      // 6. 获取公开访问URL
      const { data: urlData } = supabase.storage
        .from(APP_CONFIG.FILE_UPLOAD.BUCKET_NAME)
        .getPublicUrl(storagePath)
      
      // 7. 记录文件信息到数据库
      const fileRecord = await this.createFileRecord({
        fileName: fileName,
        originalName: fileInfo.data.name,
        filePath: storagePath,
        fileUrl: urlData.publicUrl,
        fileSize: fileInfo.data.size,
        fileType: fileInfo.data.type,
        category: category,
        uploaderId: user.id
      })
      
      return {
        success: true,
        data: {
          id: fileRecord.data?.id,
          fileName: fileName,
          fileUrl: urlData.publicUrl,
          filePath: storagePath,
          fileSize: fileInfo.data.size,
          fileType: fileInfo.data.type
        },
        error: null
      }
      
    } catch (error) {
      console.error('Upload file error:', error)
      return { 
        success: false, 
        data: null, 
        error: ERROR_MESSAGES.FILE.UPLOAD_FAILED 
      }
    }
  }
  
  /**
   * 删除文件
   * @param {string} filePath 文件存储路径
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  async deleteFile(filePath) {
    try {
      const user = hybridAuthService.getCurrentUser()
      if (!user) {
        return { success: false, error: ERROR_MESSAGES.AUTH.LOGIN_REQUIRED }
      }
      
      // 检查文件所有权
      const { data: fileRecord } = await supabase
        .from('survey_files')
        .select('uploader_id')
        .eq('file_path', filePath)
        .single()
      
      if (fileRecord && fileRecord.uploader_id !== user.id) {
        return { success: false, error: ERROR_MESSAGES.AUTH.PERMISSION_DENIED }
      }
      
      // 从 Storage 删除文件
      const { error: storageError } = await supabase.storage
        .from(APP_CONFIG.FILE_UPLOAD.BUCKET_NAME)
        .remove([filePath])
      
      if (storageError) {
        console.error('Delete file from storage failed:', storageError)
        return { success: false, error: SupabaseHelper.handleError(storageError) }
      }
      
      // 从数据库删除记录
      const { error: dbError } = await supabase
        .from('survey_files')
        .delete()
        .eq('file_path', filePath)
      
      if (dbError) {
        console.error('Delete file record failed:', dbError)
        // 文件已删除，但记录删除失败，记录警告但不返回错误
        console.warn('File deleted but database record removal failed')
      }
      
      return { success: true, error: null }
      
    } catch (error) {
      console.error('Delete file error:', error)
      return { success: false, error: '删除文件失败' }
    }
  }
  
  /**
   * 获取用户上传的文件列表
   * @param {object} options 查询选项
   * @returns {Promise<{data: array, error: string|null}>}
   */
  async getUserFiles(options = {}) {
    try {
      const user = hybridAuthService.getCurrentUser()
      if (!user) {
        return { data: [], error: ERROR_MESSAGES.AUTH.LOGIN_REQUIRED }
      }
      
      const {
        category = null,
        page = 1,
        limit = 20
      } = options
      
      const offset = (page - 1) * limit
      
      let query = supabase
        .from('survey_files')
        .select('*')
        .eq('uploader_id', user.id)
      
      if (category) {
        query = query.eq('category', category)
      }
      
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      const { data, error } = await query
      
      if (error) {
        return { data: [], error: SupabaseHelper.handleError(error) }
      }
      
      return { data: data || [], error: null }
      
    } catch (error) {
      console.error('Get user files failed:', error)
      return { data: [], error: ERROR_MESSAGES.NETWORK.CONNECTION_ERROR }
    }
  }
  
  /**
   * 获取文件信息
   * @private
   * @param {string} filePath 文件路径
   * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
   */
  async getFileInfo(filePath) {
    return new Promise((resolve) => {
      wx.getFileInfo({
        filePath: filePath,
        success: (res) => {
          // 从文件路径推断文件类型
          const extension = filePath.split('.').pop()?.toLowerCase()
          const mimeType = this.getMimeTypeFromExtension(extension)
          
          resolve({
            success: true,
            data: {
              size: res.size,
              name: `file.${extension}`,
              type: mimeType
            },
            error: null
          })
        },
        fail: (error) => {
          resolve({
            success: false,
            data: null,
            error: '获取文件信息失败'
          })
        }
      })
    })
  }
  
  /**
   * 验证文件
   * @private
   * @param {object} fileInfo 文件信息
   * @param {string} fileType 文件类型
   * @returns {object} 验证结果
   */
  validateFile(fileInfo, fileType) {
    // 检查文件大小
    if (fileInfo.size > APP_CONFIG.FILE_UPLOAD.MAX_SIZE) {
      return { success: false, error: ERROR_MESSAGES.FILE.SIZE_EXCEEDED }
    }
    
    // 检查文件类型
    if (!APP_CONFIG.FILE_UPLOAD.ALLOWED_TYPES.includes(fileInfo.type)) {
      return { success: false, error: ERROR_MESSAGES.FILE.TYPE_NOT_ALLOWED }
    }
    
    return { success: true, error: null }
  }
  
  /**
   * 读取文件内容
   * @private
   * @param {string} filePath 文件路径
   * @returns {Promise<{success: boolean, data: ArrayBuffer|null, error: string|null}>}
   */
  async readFileContent(filePath) {
    return new Promise((resolve) => {
      wx.getFileSystemManager().readFile({
        filePath: filePath,
        success: (res) => {
          resolve({
            success: true,
            data: res.data,
            error: null
          })
        },
        fail: (error) => {
          resolve({
            success: false,
            data: null,
            error: '读取文件失败'
          })
        }
      })
    })
  }
  
  /**
   * 生成文件名
   * @private
   * @param {string} originalName 原始文件名
   * @param {string} userId 用户ID
   * @returns {string} 生成的文件名
   */
  generateFileName(originalName, userId) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const extension = originalName.split('.').pop()
    
    return `${timestamp}_${random}.${extension}`
  }
  
  /**
   * 根据扩展名获取 MIME 类型
   * @private
   * @param {string} extension 文件扩展名
   * @returns {string} MIME 类型
   */
  getMimeTypeFromExtension(extension) {
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    }
    
    return mimeTypes[extension] || 'application/octet-stream'
  }
  
  /**
   * 创建文件记录
   * @private
   * @param {object} fileData 文件数据
   * @returns {Promise<{data: object|null, error: string|null}>}
   */
  async createFileRecord(fileData) {
    try {
      const { data, error } = await supabase
        .from('survey_files')
        .insert({
          file_name: fileData.fileName,
          original_name: fileData.originalName,
          file_path: fileData.filePath,
          file_url: fileData.fileUrl,
          file_size: fileData.fileSize,
          file_type: fileData.fileType,
          category: fileData.category,
          uploader_id: fileData.uploaderId
        })
        .select()
        .single()
      
      return { data, error }
      
    } catch (error) {
      console.error('Create file record failed:', error)
      return { data: null, error: error.message }
    }
  }
}

// 创建单例实例
const fileUploadService = new FileUploadService()

module.exports = fileUploadService

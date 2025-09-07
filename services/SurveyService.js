/**
 * 投票服务
 * 处理投票相关的所有业务逻辑
 */

const { supabase, SupabaseHelper } = require("../config/supabase.js");
const { APP_CONFIG, ERROR_MESSAGES } = require("../config/app.js");
const hybridAuthService = require("./HybridAuthService.js");

class SurveyService {
  /**
   * 获取公开投票列表
   * 支持匿名访问，根据用户登录状态返回不同级别的投票
   * @param {object} options 查询选项
   * @returns {Promise<{data: array, error: string|null, hasMore: boolean}>}
   */
  async getPublicSurveys(options = {}) {
    const {
      page = 1,
      limit = APP_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
      orderBy = "created_at",
      orderDirection = "desc",
      searchKeyword = "",
    } = options;

    try {
      const offset = (page - 1) * limit;
      const user = hybridAuthService.getCurrentUser();

      // 构建查询
      let query = supabase.from("public_surveys").select(`
          id, title, description, cover_image_url,
          survey_type, access_level, total_votes,
          total_participants, view_count, end_time, created_at,
          is_featured, creator_name, creator_avatar, options
        `);

      // 根据用户登录状态过滤访问级别
      if (user) {
        // 已登录用户可以看到 public 和 authenticated 级别的投票
        query = query.in("access_level", ["public", "authenticated"]);
      } else {
        // 匿名用户只能看到 public 级别的投票
        query = query.eq("access_level", "public");
      }

      // 搜索关键词
      if (searchKeyword) {
        query = query.or(
          `title.ilike.%${searchKeyword}%,description.ilike.%${searchKeyword}%`
        );
      }

      // 排序和分页
      query = query
        .order("is_featured", { ascending: false }) // 置顶优先
        .order(orderBy, { ascending: orderDirection === "asc" })
        .range(offset, offset + limit);

      const { data, error } = await query;

      if (error) {
        return {
          data: [],
          error: SupabaseHelper.handleError(error),
          hasMore: false,
        };
      }

      // 检查是否还有更多数据
      const hasMore = data && data.length === limit + 1;
      if (hasMore) {
        data.pop(); // 移除多查询的一条记录
      }

      return {
        data: data || [],
        error: null,
        hasMore,
      };
    } catch (error) {
      console.error("Get public surveys failed:", error);
      return {
        data: [],
        error: ERROR_MESSAGES.NETWORK.CONNECTION_ERROR,
        hasMore: false,
      };
    }
  }

  /**
   * 获取投票详情
   * @param {string} surveyId 投票ID
   * @returns {Promise<{data: object|null, error: string|null}>}
   */
  async getSurveyDetail(surveyId) {
    try {
      const user = hybridAuthService.getCurrentUser();

      // 获取投票基本信息
      const { data: survey, error: surveyError } = await supabase
        .from("surveys")
        .select(
          `
          id, title, description, cover_image_url,
          survey_type, access_level, total_votes,
          total_participants, end_time, created_at,
          creator_id, status
        `
        )
        .eq("id", surveyId)
        .single();

      if (surveyError) {
        return {
          data: null,
          error:
            surveyError.code === "PGRST116"
              ? ERROR_MESSAGES.SURVEY.NOT_FOUND
              : SupabaseHelper.handleError(surveyError),
        };
      }

      // 检查访问权限
      if (!this.checkSurveyAccess(survey, user)) {
        return {
          data: null,
          error: ERROR_MESSAGES.SURVEY.ACCESS_DENIED,
        };
      }

      // 获取创建者信息
      let creatorInfo = null;
      if (survey.creator_id) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("full_name, username, email, avatar_url")
            .eq("id", survey.creator_id)
            .single();

          if (!profileError && profile) {
            creatorInfo = profile;
          }
        } catch (error) {
          // 如果获取创建者信息失败，不影响整个查询
          console.warn("Failed to get creator info:", error);
        }
      }

      // 获取投票选项
      const { data: options, error: optionsError } = await supabase
        .from("survey_options")
        .select("*")
        .eq("survey_id", surveyId)
        .order("sort_order");

      if (optionsError) {
        return {
          data: null,
          error: SupabaseHelper.handleError(optionsError),
        };
      }

      // 检查用户是否已参与
      let hasParticipated = false;
      if (user) {
        const { data: participation } = await supabase
          .from("survey_participations")
          .select("id")
          .eq("survey_id", surveyId)
          .eq("participant_id", user.id)
          .single();

        hasParticipated = !!participation;
      }

      return {
        data: {
          ...survey,
          options: options || [],
          hasParticipated,
          creator: creatorInfo,
        },
        error: null,
      };
    } catch (error) {
      console.error("Get survey detail failed:", error);
      return {
        data: null,
        error: ERROR_MESSAGES.NETWORK.CONNECTION_ERROR,
      };
    }
  }

  /**
   * 参与投票
   * @param {string} surveyId 投票ID
   * @param {array} selectedOptionIds 选中的选项ID数组
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  async participateInSurvey(surveyId, selectedOptionIds) {
    try {
      const user = hybridAuthService.getCurrentUser();
      if (!user) {
        return { success: false, error: ERROR_MESSAGES.AUTH.LOGIN_REQUIRED };
      }

      // 验证选项
      if (!selectedOptionIds || selectedOptionIds.length === 0) {
        return { success: false, error: ERROR_MESSAGES.SURVEY.INVALID_OPTIONS };
      }

      // 调用存储过程参与投票
      const { data, error } = await supabase.rpc("participate_in_survey", {
        p_survey_id: surveyId,
        p_participant_id: user.id,
        p_selected_option_ids: selectedOptionIds,
      });

      if (error) {
        // 处理特定错误
        if (error.message?.includes("already participated")) {
          return {
            success: false,
            error: ERROR_MESSAGES.SURVEY.ALREADY_PARTICIPATED,
          };
        }

        if (error.message?.includes("expired")) {
          return { success: false, error: ERROR_MESSAGES.SURVEY.EXPIRED };
        }

        return { success: false, error: SupabaseHelper.handleError(error) };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("Participate in survey failed:", error);
      return { success: false, error: ERROR_MESSAGES.NETWORK.CONNECTION_ERROR };
    }
  }

  /**
   * 获取用户创建的投票列表
   * @param {object} options 查询选项
   * @returns {Promise<{data: array, error: string|null}>}
   */
  async getUserSurveys(options = {}) {
    try {
      const user = hybridAuthService.getCurrentUser();
      if (!user) {
        return { data: [], error: ERROR_MESSAGES.AUTH.LOGIN_REQUIRED };
      }

      const {
        page = 1,
        limit = APP_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
        status = null,
      } = options;

      const offset = (page - 1) * limit;

      let query = supabase
        .from("surveys")
        .select(
          `
          id, title, description, cover_image_url,
          survey_type, access_level, total_votes,
          total_participants, end_time, created_at,
          status, is_featured
        `
        )
        .eq("creator_id", user.id);

      // 状态过滤
      if (status) {
        query = query.eq("status", status);
      }

      query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        return {
          data: [],
          error: SupabaseHelper.handleError(error),
        };
      }

      return {
        data: data || [],
        error: null,
      };
    } catch (error) {
      console.error("Get user surveys failed:", error);
      return {
        data: [],
        error: ERROR_MESSAGES.NETWORK.CONNECTION_ERROR,
      };
    }
  }

  /**
   * 检查投票访问权限
   * @private
   * @param {object} survey 投票对象
   * @param {object|null} user 用户对象
   * @returns {boolean} 是否有访问权限
   */
  checkSurveyAccess(survey, user) {
    if (!survey) return false;

    // 检查投票状态
    if (survey.status !== "active") return false;

    // 检查访问级别
    switch (survey.access_level) {
      case "public":
        return true;

      case "authenticated":
        return !!user;

      case "owner_only":
        return user && user.id === survey.creator_id;

      default:
        return false;
    }
  }
}

// 创建单例实例
const surveyService = new SurveyService();

module.exports = surveyService;

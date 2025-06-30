const Post = require('../models/Post');
const Follow = require('../models/Follow');
const { AppError } = require('../middlewares/errorHandler');
const { calculatePagination } = require('../middlewares/responseFormatter');

class PostService {
  // ===== CREAR POST =====
  static async createPost(userId, postData) {
    const { title, content, tags } = postData;

    // Procesar tags (limpiar y normalizar)
    const processedTags = this.processTags(tags);

    // Crear post
    const post = await Post.create({
      userId,
      title,
      content,
      tags: processedTags
    });

    // Poblar para respuesta
    await post.populate('userId', 'firstName lastName');

    return this.formatPostData(post, true);
  }

  // ===== OBTENER TODOS LOS POSTS =====
  static async getAllPosts(paginationData, filters = {}) {
    const { 
      page, 
      limit, 
      sort = '-createdAt',
      tags,
      search,
      userId
    } = { ...paginationData, ...filters };

    // Construir filtros
    const searchFilters = {};

    if (userId) {
      searchFilters.userId = userId;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      searchFilters.tags = { $in: tagArray };
    }

    if (search) {
      searchFilters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Post.countDocuments(searchFilters));

    // Obtener posts
    const posts = await Post.find(searchFilters)
      .populate('userId', 'firstName lastName')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      posts: posts.map(post => this.formatPostData(post)),
      pagination
    };
  }

  // ===== OBTENER POST POR ID =====
  static async getPostById(postId) {
    const post = await Post.findById(postId)
      .populate('userId', 'firstName lastName');

    if (!post) {
      throw new AppError('Post no encontrado', 404, 'POST_NOT_FOUND');
    }

    return this.formatPostData(post, true);
  }

  // ===== OBTENER POSTS DEL USUARIO =====
  static async getUserPosts(userId, paginationData) {
    const { page, limit, sort = '-createdAt' } = paginationData;

    const filters = { userId };

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Post.countDocuments(filters));

    // Obtener posts
    const posts = await Post.find(filters)
      .populate('userId', 'firstName lastName')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      posts: posts.map(post => this.formatPostData(post)),
      pagination
    };
  }

  // ===== OBTENER FEED DEL USUARIO =====
  static async getUserFeed(userId, paginationData) {
    const { page, limit, sort = '-createdAt' } = paginationData;

    // Obtener usuarios que sigue
    const follows = await Follow.find({ followerId: userId }).select('followedId');
    const followedUserIds = follows.map(follow => follow.followedId);
    
    // Incluir posts propios
    followedUserIds.push(userId);

    const filters = { userId: { $in: followedUserIds } };

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Post.countDocuments(filters));

    // Obtener posts del feed
    const posts = await Post.find(filters)
      .populate('userId', 'firstName lastName')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      posts: posts.map(post => this.formatPostData(post)),
      pagination,
      feedInfo: {
        followingCount: follows.length,
        includesOwnPosts: true
      }
    };
  }

  // ===== ACTUALIZAR POST =====
  static async updatePost(postId, userId, updateData) {
    const { title, content, tags } = updateData;

    const post = await Post.findById(postId);
    if (!post) {
      throw new AppError('Post no encontrado', 404, 'POST_NOT_FOUND');
    }

    // Verificar que el usuario sea el autor
    if (post.userId.toString() !== userId.toString()) {
      throw new AppError('Solo puedes editar tus propios posts', 403, 'NOT_POST_AUTHOR');
    }

    // Actualizar campos
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (tags !== undefined) post.tags = this.processTags(tags);

    await post.save();

    // Poblar para respuesta
    await post.populate('userId', 'firstName lastName');

    return this.formatPostData(post, true);
  }

  // ===== ELIMINAR POST =====
  static async deletePost(postId, userId, userRole = null) {
    const post = await Post.findById(postId);
    if (!post) {
      throw new AppError('Post no encontrado', 404, 'POST_NOT_FOUND');
    }

    // Verificar permisos
    if (userRole !== 'admin' && post.userId.toString() !== userId.toString()) {
      throw new AppError('Solo puedes eliminar tus propios posts', 403, 'NOT_POST_AUTHOR');
    }

    await Post.findByIdAndDelete(postId);

    return { message: 'Post eliminado exitosamente' };
  }

  // ===== BUSCAR POSTS =====
  static async searchPosts(searchQuery, paginationData) {
    const { q, page, limit, sort = '-createdAt' } = { ...searchQuery, ...paginationData };

    if (!q || q.trim().length < 2) {
      throw new AppError('El término de búsqueda debe tener al menos 2 caracteres', 400, 'INVALID_SEARCH_TERM');
    }

    const searchRegex = { $regex: q.trim(), $options: 'i' };
    
    const filters = {
      $or: [
        { title: searchRegex },
        { content: searchRegex },
        { tags: searchRegex }
      ]
    };

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Post.countDocuments(filters));

    // Buscar posts
    const posts = await Post.find(filters)
      .populate('userId', 'firstName lastName')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      posts: posts.map(post => this.formatPostData(post)),
      pagination,
      searchTerm: q
    };
  }

  // ===== OBTENER POSTS POR TAG =====
  static async getPostsByTag(tag, paginationData) {
    const { page, limit, sort = '-createdAt' } = paginationData;

    const filters = { tags: tag.toLowerCase() };

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Post.countDocuments(filters));

    // Obtener posts
    const posts = await Post.find(filters)
      .populate('userId', 'firstName lastName')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      tag,
      posts: posts.map(post => this.formatPostData(post)),
      pagination
    };
  }

  // ===== OBTENER TAGS POPULARES =====
  static async getPopularTags(limit = 20) {
    const pipeline = [
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
          latestPost: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1, latestPost: -1 } },
      { $limit: parseInt(limit) }
    ];

    const results = await Post.aggregate(pipeline);

    return results.map(result => ({
      tag: result._id,
      postCount: result.count,
      latestActivity: result.latestPost
    }));
  }

  // ===== OBTENER POSTS POPULARES =====
  static async getPopularPosts(timeframe = 'week', limit = 10) {
    // Calcular fecha según timeframe
    const date = new Date();
    switch (timeframe) {
      case 'day':
        date.setDate(date.getDate() - 1);
        break;
      case 'week':
        date.setDate(date.getDate() - 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - 1);
        break;
      default:
        date.setDate(date.getDate() - 7);
    }

    // Por ahora, usar posts más recientes como "populares"
    // TODO: Implementar sistema de puntuación basado en reacciones, comentarios, etc.
    const posts = await Post.find({
      createdAt: { $gte: date }
    })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return posts.map(post => this.formatPostData(post));
  }

  // ===== OBTENER POSTS RECIENTES =====
  static async getRecentPosts(limit = 10) {
    const posts = await Post.find({})
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return posts.map(post => this.formatPostData(post));
  }

  // ===== OBTENER ESTADÍSTICAS DE POSTS =====
  static async getPostStats(filters = {}) {
    const { dateFrom, dateTo, userId } = filters;
    
    const matchFilters = {};
    if (dateFrom || dateTo) {
      matchFilters.createdAt = {};
      if (dateFrom) matchFilters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchFilters.createdAt.$lte = new Date(dateTo);
    }

    if (userId) {
      matchFilters.userId = userId;
    }

    // Estadísticas generales
    const totalStats = await Post.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          uniqueAuthors: { $addToSet: '$userId' },
          allTags: { $push: '$tags' }
        }
      },
      {
        $project: {
          totalPosts: 1,
          uniqueAuthors: { $size: '$uniqueAuthors' },
          allTags: {
            $reduce: {
              input: '$allTags',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] }
            }
          }
        }
      }
    ]);

    // Estadísticas por fecha
    const dateStats = await Post.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const result = totalStats[0] || {
      totalPosts: 0,
      uniqueAuthors: 0,
      allTags: []
    };

    return {
      summary: {
        totalPosts: result.totalPosts,
        uniqueAuthors: result.uniqueAuthors,
        uniqueTags: [...new Set(result.allTags)].length
      },
      byDate: dateStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };
  }

  // ===== UTILITY METHODS =====

  // Procesar y normalizar tags
  static processTags(tags) {
    if (!tags) return [];
    
    const tagArray = Array.isArray(tags) ? tags : [tags];
    
    return tagArray
      .map(tag => tag.toString().toLowerCase().trim())
      .filter(tag => tag.length > 0 && tag.length <= 30)
      .slice(0, 10); // Máximo 10 tags por post
  }

  // Formatear datos de post para respuesta
  static formatPostData(post, includeDetails = false) {
    const formatted = {
      id: post._id,
      userId: post.userId._id || post.userId,
      title: post.title,
      content: includeDetails ? post.content : this.truncateContent(post.content),
      tags: post.tags,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt
    };

    // Agregar información del usuario si está poblada
    if (post.userId && post.userId.firstName) {
      formatted.author = {
        firstName: post.userId.firstName,
        lastName: post.userId.lastName
      };
    }

    return formatted;
  }

  // Truncar contenido para lista
  static truncateContent(content, maxLength = 200) {
    if (!content || content.length <= maxLength) {
      return content;
    }
    
    return content.substring(0, maxLength).trim() + '...';
  }

  // Verificar si un post pertenece a un usuario
  static async verifyPostOwnership(postId, userId) {
    const post = await Post.findById(postId).select('userId');
    return post && post.userId.toString() === userId.toString();
  }

  // Obtener posts relacionados
  static async getRelatedPosts(postId, limit = 5) {
    const post = await Post.findById(postId);
    if (!post) {
      throw new AppError('Post no encontrado', 404, 'POST_NOT_FOUND');
    }

    // Buscar posts con tags similares, excluyendo el post actual
    const relatedPosts = await Post.find({
      _id: { $ne: postId },
      tags: { $in: post.tags }
    })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return relatedPosts.map(post => this.formatPostData(post));
  }

  // Obtener actividad reciente de un usuario
  static async getUserActivity(userId, limit = 10) {
    const posts = await Post.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('title createdAt tags');

    return posts.map(post => ({
      type: 'post',
      id: post._id,
      title: post.title,
      tags: post.tags,
      createdAt: post.createdAt
    }));
  }

  // Sugerir tags basados en contenido
  static suggestTags(content, existingTags = []) {
    if (!content) return [];

    // Palabras comunes que no deben ser tags
    const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'pero', 'de', 'en', 'a', 'con', 'por', 'para'];
    
    // Extraer palabras del contenido
    const words = content
      .toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 5);

    // Filtrar palabras que ya están en tags existentes
    const suggestions = words.filter(word => 
      !existingTags.some(tag => tag.toLowerCase().includes(word))
    );

    return suggestions;
  }

  // Obtener estadísticas del usuario
  static async getUserPostStats(userId) {
    const stats = await Post.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          allTags: { $push: '$tags' },
          firstPost: { $min: '$createdAt' },
          latestPost: { $max: '$createdAt' }
        }
      }
    ]);

    if (!stats.length) {
      return {
        totalPosts: 0,
        uniqueTags: 0,
        firstPost: null,
        latestPost: null,
        topTags: []
      };
    }

    const result = stats[0];
    const allTags = result.allTags.flat();
    const tagCounts = {};
    
    allTags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    const topTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    return {
      totalPosts: result.totalPosts,
      uniqueTags: Object.keys(tagCounts).length,
      firstPost: result.firstPost,
      latestPost: result.latestPost,
      topTags
    };
  }
}

module.exports = PostService; 
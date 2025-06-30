const Comment = require('../models/Comment');
const Product = require('../models/Product');
const Post = require('../models/Post');
const { AppError } = require('../middlewares/errorHandler');
const { calculatePagination } = require('../middlewares/responseFormatter');
const { TARGET_TYPES } = require('../config/constants');

class CommentService {
  // ===== CREAR COMENTARIO =====
  static async createComment(userId, commentData) {
    const { parentType, parentId, content, parentCommentId } = commentData;

    // Validar parentType
    if (!Object.values(TARGET_TYPES).includes(parentType)) {
      throw new AppError('Tipo de padre inválido', 400, 'INVALID_PARENT_TYPE');
    }

    // Verificar que el elemento padre exista
    await this.verifyParentExists(parentType, parentId);

    // Si es respuesta a un comentario, verificar que exista
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        throw new AppError('Comentario padre no encontrado', 404, 'PARENT_COMMENT_NOT_FOUND');
      }

      // Verificar que el comentario padre sea del mismo elemento
      if (parentComment.parentId.toString() !== parentId || parentComment.parentType !== parentType) {
        throw new AppError('El comentario padre no pertenece al mismo elemento', 400, 'INVALID_PARENT_COMMENT');
      }
    }

    // Crear comentario
    const comment = await Comment.create({
      userId,
      parentType,
      parentId,
      content,
      parentCommentId: parentCommentId || null
    });

    // Poblar para respuesta
    await comment.populate('userId', 'firstName lastName');

    return this.formatCommentData(comment, true);
  }

  // ===== OBTENER COMENTARIOS DE UN ELEMENTO =====
  static async getComments(parentType, parentId, paginationData, options = {}) {
    const { page, limit, sort = 'createdAt' } = paginationData;
    const { includeReplies = false, maxDepth = 2 } = options;

    // Verificar que el elemento padre exista
    await this.verifyParentExists(parentType, parentId);

    // Construir filtros para comentarios principales (sin padre)
    const filters = {
      parentType,
      parentId,
      parentCommentId: null // Solo comentarios principales
    };

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Comment.countDocuments(filters));

    // Obtener comentarios principales
    const comments = await Comment.find(filters)
      .populate('userId', 'firstName lastName')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    // Si se solicitan respuestas, cargarlas
    let formattedComments = comments.map(comment => this.formatCommentData(comment));

    if (includeReplies) {
      for (let i = 0; i < formattedComments.length; i++) {
        formattedComments[i].replies = await this.getCommentReplies(
          formattedComments[i].id, 
          1, 
          maxDepth
        );
      }
    }

    return {
      comments: formattedComments,
      pagination,
      parentInfo: {
        type: parentType,
        id: parentId
      }
    };
  }

  // ===== OBTENER COMENTARIO POR ID =====
  static async getCommentById(commentId, includeReplies = false) {
    const comment = await Comment.findById(commentId)
      .populate('userId', 'firstName lastName');

    if (!comment) {
      throw new AppError('Comentario no encontrado', 404, 'COMMENT_NOT_FOUND');
    }

    const formattedComment = this.formatCommentData(comment, true);

    if (includeReplies) {
      formattedComment.replies = await this.getCommentReplies(commentId, 1, 3);
    }

    return formattedComment;
  }

  // ===== OBTENER RESPUESTAS DE UN COMENTARIO =====
  static async getCommentReplies(commentId, currentDepth = 1, maxDepth = 3) {
    if (currentDepth > maxDepth) {
      return [];
    }

    const replies = await Comment.find({ parentCommentId: commentId })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: 1 });

    const formattedReplies = [];

    for (const reply of replies) {
      const formattedReply = this.formatCommentData(reply);
      
      // Cargar respuestas anidadas recursivamente
      if (currentDepth < maxDepth) {
        formattedReply.replies = await this.getCommentReplies(
          reply._id, 
          currentDepth + 1, 
          maxDepth
        );
      }

      formattedReplies.push(formattedReply);
    }

    return formattedReplies;
  }

  // ===== OBTENER COMENTARIOS DEL USUARIO =====
  static async getUserComments(userId, paginationData) {
    const { page, limit, sort = '-createdAt' } = paginationData;

    const filters = { userId };

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Comment.countDocuments(filters));

    // Obtener comentarios
    const comments = await Comment.find(filters)
      .populate('userId', 'firstName lastName')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      comments: comments.map(comment => this.formatCommentData(comment)),
      pagination
    };
  }

  // ===== ACTUALIZAR COMENTARIO =====
  static async updateComment(commentId, userId, updateData) {
    const { content } = updateData;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new AppError('Comentario no encontrado', 404, 'COMMENT_NOT_FOUND');
    }

    // Verificar que el usuario sea el autor
    if (comment.userId.toString() !== userId.toString()) {
      throw new AppError('Solo puedes editar tus propios comentarios', 403, 'NOT_COMMENT_AUTHOR');
    }

    // Actualizar contenido
    comment.content = content;
    comment.isEdited = true;
    await comment.save();

    // Poblar para respuesta
    await comment.populate('userId', 'firstName lastName');

    return this.formatCommentData(comment, true);
  }

  // ===== ELIMINAR COMENTARIO =====
  static async deleteComment(commentId, userId, userRole = null) {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new AppError('Comentario no encontrado', 404, 'COMMENT_NOT_FOUND');
    }

    // Verificar permisos
    if (userRole !== 'admin' && comment.userId.toString() !== userId.toString()) {
      throw new AppError('Solo puedes eliminar tus propios comentarios', 403, 'NOT_COMMENT_AUTHOR');
    }

    // Eliminar comentario y todas sus respuestas
    await this.deleteCommentAndReplies(commentId);

    return { message: 'Comentario eliminado exitosamente' };
  }

  // ===== OBTENER TODOS LOS COMENTARIOS (ADMIN) =====
  static async getAllComments(filters, paginationData) {
    const { 
      page, 
      limit, 
      sort = '-createdAt',
      parentType,
      dateFrom,
      dateTo,
      search
    } = { ...filters, ...paginationData };

    // Construir filtros
    const searchFilters = {};

    if (parentType) {
      searchFilters.parentType = parentType;
    }

    if (dateFrom || dateTo) {
      searchFilters.createdAt = {};
      if (dateFrom) searchFilters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) searchFilters.createdAt.$lte = new Date(dateTo);
    }

    if (search) {
      searchFilters.content = { $regex: search, $options: 'i' };
    }

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Comment.countDocuments(searchFilters));

    // Obtener comentarios
    const comments = await Comment.find(searchFilters)
      .populate('userId', 'firstName lastName email')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      comments: comments.map(comment => this.formatCommentData(comment)),
      pagination
    };
  }

  // ===== OBTENER COMENTARIOS RECIENTES =====
  static async getRecentComments(limit = 10, parentType = null) {
    const filters = {};
    if (parentType) {
      filters.parentType = parentType;
    }

    const comments = await Comment.find(filters)
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return comments.map(comment => this.formatCommentData(comment));
  }

  // ===== OBTENER ESTADÍSTICAS DE COMENTARIOS =====
  static async getCommentsStats(filters = {}) {
    const { dateFrom, dateTo, parentType } = filters;
    
    const matchFilters = {};
    if (dateFrom || dateTo) {
      matchFilters.createdAt = {};
      if (dateFrom) matchFilters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchFilters.createdAt.$lte = new Date(dateTo);
    }

    if (parentType) {
      matchFilters.parentType = parentType;
    }

    // Estadísticas generales
    const totalStats = await Comment.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: null,
          totalComments: { $sum: 1 },
          mainComments: {
            $sum: { $cond: [{ $eq: ['$parentCommentId', null] }, 1, 0] }
          },
          replies: {
            $sum: { $cond: [{ $ne: ['$parentCommentId', null] }, 1, 0] }
          }
        }
      }
    ]);

    // Estadísticas por tipo
    const typeStats = await Comment.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: '$parentType',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = totalStats[0] || {
      totalComments: 0,
      mainComments: 0,
      replies: 0
    };

    return {
      summary: result,
      byType: typeStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };
  }

  // ===== CONTAR COMENTARIOS DE UN ELEMENTO =====
  static async countElementComments(parentType, parentId) {
    return await Comment.countDocuments({ parentType, parentId });
  }

  // ===== UTILITY METHODS =====

  // Verificar que el elemento padre exista
  static async verifyParentExists(parentType, parentId) {
    let exists = false;

    switch (parentType) {
      case TARGET_TYPES.PRODUCT:
        const product = await Product.findById(parentId);
        exists = product && product.isActive;
        break;
      case TARGET_TYPES.POST:
        const post = await Post.findById(parentId);
        exists = !!post;
        break;
      // Agregar más tipos según sea necesario
      default:
        throw new AppError('Tipo de elemento no soportado', 400, 'UNSUPPORTED_PARENT_TYPE');
    }

    if (!exists) {
      throw new AppError('El elemento padre no existe o no está disponible', 404, 'PARENT_NOT_FOUND');
    }
  }

  // Eliminar comentario y todas sus respuestas recursivamente
  static async deleteCommentAndReplies(commentId) {
    // Obtener todas las respuestas
    const replies = await Comment.find({ parentCommentId: commentId });

    // Eliminar respuestas recursivamente
    for (const reply of replies) {
      await this.deleteCommentAndReplies(reply._id);
    }

    // Eliminar el comentario principal
    await Comment.findByIdAndDelete(commentId);
  }

  // Formatear datos de comentario para respuesta
  static formatCommentData(comment, includeDetails = false) {
    const formatted = {
      id: comment._id,
      userId: comment.userId._id || comment.userId,
      parentType: comment.parentType,
      parentId: comment.parentId,
      content: comment.content,
      isEdited: comment.isEdited,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt
    };

    // Agregar información del usuario si está poblada
    if (comment.userId && comment.userId.firstName) {
      formatted.user = {
        firstName: comment.userId.firstName,
        lastName: comment.userId.lastName
      };
    }

    if (includeDetails) {
      formatted.parentCommentId = comment.parentCommentId;
    }

    return formatted;
  }

  // Verificar si un comentario pertenece a un usuario
  static async verifyCommentOwnership(commentId, userId) {
    const comment = await Comment.findById(commentId).select('userId');
    return comment && comment.userId.toString() === userId.toString();
  }

  // Obtener jerarquía completa de un comentario
  static async getCommentHierarchy(commentId) {
    const comment = await Comment.findById(commentId)
      .populate('userId', 'firstName lastName');

    if (!comment) {
      throw new AppError('Comentario no encontrado', 404, 'COMMENT_NOT_FOUND');
    }

    const hierarchy = [this.formatCommentData(comment)];

    // Si tiene padre, obtener la jerarquía hacia arriba
    if (comment.parentCommentId) {
      const parentHierarchy = await this.getCommentHierarchy(comment.parentCommentId);
      hierarchy.unshift(...parentHierarchy);
    }

    return hierarchy;
  }

  // Obtener threads de comentarios más activos
  static async getActiveThreads(parentType, parentId, limit = 5) {
    const pipeline = [
      { $match: { parentType, parentId } },
      {
        $group: {
          _id: { $ifNull: ['$parentCommentId', '$_id'] },
          commentCount: { $sum: 1 },
          latestComment: { $max: '$createdAt' },
          firstComment: { $first: '$$ROOT' }
        }
      },
      { $sort: { commentCount: -1, latestComment: -1 } },
      { $limit: parseInt(limit) }
    ];

    const threads = await Comment.aggregate(pipeline);

    // Poblar información del primer comentario de cada thread
    const populatedThreads = [];
    for (const thread of threads) {
      const comment = await Comment.findById(thread.firstComment._id)
        .populate('userId', 'firstName lastName');
      
      populatedThreads.push({
        threadId: thread._id,
        firstComment: this.formatCommentData(comment),
        commentCount: thread.commentCount,
        latestActivity: thread.latestComment
      });
    }

    return populatedThreads;
  }
}

module.exports = CommentService; 
const Reaction = require('../models/Reaction');
const Product = require('../models/Product');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { AppError } = require('../middlewares/errorHandler');
const { calculatePagination } = require('../middlewares/responseFormatter');
const { REACTION_TYPES, TARGET_TYPES } = require('../config/constants');

class ReactionService {
  // ===== AGREGAR O ACTUALIZAR REACCIÓN =====
  static async toggleReaction(userId, reactionData) {
    const { targetType, targetId, reactionType } = reactionData;

    // Validar targetType
    if (!Object.values(TARGET_TYPES).includes(targetType)) {
      throw new AppError('Tipo de objetivo inválido', 400, 'INVALID_TARGET_TYPE');
    }

    // Validar reactionType
    if (!Object.values(REACTION_TYPES).includes(reactionType)) {
      throw new AppError('Tipo de reacción inválido', 400, 'INVALID_REACTION_TYPE');
    }

    // Verificar que el elemento objetivo exista
    await this.verifyTargetExists(targetType, targetId);

    // Buscar reacción existente del usuario en este elemento
    const existingReaction = await Reaction.findOne({
      userId,
      targetType,
      targetId
    });

    if (existingReaction) {
      if (existingReaction.reactionType === reactionType) {
        // Misma reacción, eliminar (toggle off)
        await Reaction.findByIdAndDelete(existingReaction._id);
        
        return {
          action: 'removed',
          reactionType,
          targetType,
          targetId,
          counts: await this.getReactionCounts(targetType, targetId)
        };
      } else {
        // Diferente reacción, actualizar
        existingReaction.reactionType = reactionType;
        await existingReaction.save();
        
        return {
          action: 'updated',
          reactionType,
          previousReaction: existingReaction.reactionType,
          targetType,
          targetId,
          counts: await this.getReactionCounts(targetType, targetId)
        };
      }
    } else {
      // Nueva reacción
      await Reaction.create({
        userId,
        targetType,
        targetId,
        reactionType
      });
      
      return {
        action: 'added',
        reactionType,
        targetType,
        targetId,
        counts: await this.getReactionCounts(targetType, targetId)
      };
    }
  }

  // ===== OBTENER REACCIONES DE UN ELEMENTO =====
  static async getTargetReactions(targetType, targetId, paginationData = {}) {
    const { page, limit, sort = '-createdAt' } = paginationData;

    // Verificar que el elemento objetivo exista
    await this.verifyTargetExists(targetType, targetId);

    const filters = { targetType, targetId };

    // Si se solicita paginación
    if (page && limit) {
      const pagination = calculatePagination(page, limit, await Reaction.countDocuments(filters));

      const reactions = await Reaction.find(filters)
        .populate('userId', 'firstName lastName')
        .sort(sort)
        .skip(pagination.offset)
        .limit(pagination.limit);

      return {
        reactions: reactions.map(reaction => this.formatReactionData(reaction)),
        pagination,
        counts: await this.getReactionCounts(targetType, targetId)
      };
    } else {
      // Sin paginación, solo estadísticas
      const counts = await this.getReactionCounts(targetType, targetId);
      const totalReactions = await Reaction.countDocuments(filters);

      return {
        targetType,
        targetId,
        totalReactions,
        counts
      };
    }
  }

  // ===== OBTENER REACCIONES DEL USUARIO =====
  static async getUserReactions(userId, paginationData, filters = {}) {
    const { page, limit, sort = '-createdAt' } = paginationData;
    const { targetType, reactionType } = filters;

    // Construir filtros
    const searchFilters = { userId };

    if (targetType) {
      searchFilters.targetType = targetType;
    }

    if (reactionType) {
      searchFilters.reactionType = reactionType;
    }

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Reaction.countDocuments(searchFilters));

    // Obtener reacciones
    const reactions = await Reaction.find(searchFilters)
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      reactions: reactions.map(reaction => this.formatReactionData(reaction)),
      pagination
    };
  }

  // ===== OBTENER REACCIÓN ESPECÍFICA =====
  static async getUserReactionForTarget(userId, targetType, targetId) {
    const reaction = await Reaction.findOne({
      userId,
      targetType,
      targetId
    });

    return reaction ? this.formatReactionData(reaction) : null;
  }

  // ===== OBTENER CONTEOS DE REACCIONES =====
  static async getReactionCounts(targetType, targetId) {
    const pipeline = [
      { $match: { targetType, targetId } },
      {
        $group: {
          _id: '$reactionType',
          count: { $sum: 1 }
        }
      }
    ];

    const results = await Reaction.aggregate(pipeline);
    
    // Inicializar conteos con 0
    const counts = {};
    Object.values(REACTION_TYPES).forEach(type => {
      counts[type] = 0;
    });

    // Llenar conteos reales
    results.forEach(result => {
      counts[result._id] = result.count;
    });

    // Calcular total
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    return {
      ...counts,
      total
    };
  }

  // ===== OBTENER ELEMENTOS MÁS REACTIVOS =====
  static async getMostReactedTargets(targetType, limit = 10, timeframe = null) {
    const matchFilters = { targetType };

    // Filtro de tiempo opcional
    if (timeframe) {
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
      }
      matchFilters.createdAt = { $gte: date };
    }

    const pipeline = [
      { $match: matchFilters },
      {
        $group: {
          _id: '$targetId',
          totalReactions: { $sum: 1 },
          reactionBreakdown: {
            $push: '$reactionType'
          }
        }
      },
      { $sort: { totalReactions: -1 } },
      { $limit: parseInt(limit) }
    ];

    const results = await Reaction.aggregate(pipeline);

    // Enriquecer con información del elemento
    const enrichedResults = [];
    for (const result of results) {
      let targetInfo = null;
      
      switch (targetType) {
        case TARGET_TYPES.PRODUCT:
          const product = await Product.findById(result._id).select('name sku price');
          targetInfo = product;
          break;
        case TARGET_TYPES.POST:
          const post = await Post.findById(result._id).select('title content createdAt');
          targetInfo = post;
          break;
        case TARGET_TYPES.COMMENT:
          const comment = await Comment.findById(result._id).select('content createdAt');
          targetInfo = comment;
          break;
      }

      if (targetInfo) {
        // Calcular breakdown de reacciones
        const breakdown = {};
        Object.values(REACTION_TYPES).forEach(type => {
          breakdown[type] = result.reactionBreakdown.filter(r => r === type).length;
        });

        enrichedResults.push({
          targetId: result._id,
          targetType,
          targetInfo,
          totalReactions: result.totalReactions,
          reactionBreakdown: breakdown
        });
      }
    }

    return enrichedResults;
  }

  // ===== ELIMINAR REACCIÓN =====
  static async removeReaction(userId, targetType, targetId) {
    const reaction = await Reaction.findOne({ userId, targetType, targetId });

    if (!reaction) {
      throw new AppError('Reacción no encontrada', 404, 'REACTION_NOT_FOUND');
    }

    await Reaction.findByIdAndDelete(reaction._id);

    return {
      message: 'Reacción eliminada exitosamente',
      targetType,
      targetId,
      counts: await this.getReactionCounts(targetType, targetId)
    };
  }

  // ===== OBTENER TODAS LAS REACCIONES (ADMIN) =====
  static async getAllReactions(filters, paginationData) {
    const { 
      page, 
      limit, 
      sort = '-createdAt',
      targetType,
      reactionType,
      dateFrom,
      dateTo
    } = { ...filters, ...paginationData };

    // Construir filtros
    const searchFilters = {};

    if (targetType) {
      searchFilters.targetType = targetType;
    }

    if (reactionType) {
      searchFilters.reactionType = reactionType;
    }

    if (dateFrom || dateTo) {
      searchFilters.createdAt = {};
      if (dateFrom) searchFilters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) searchFilters.createdAt.$lte = new Date(dateTo);
    }

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Reaction.countDocuments(searchFilters));

    // Obtener reacciones
    const reactions = await Reaction.find(searchFilters)
      .populate('userId', 'firstName lastName email')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      reactions: reactions.map(reaction => this.formatReactionData(reaction)),
      pagination
    };
  }

  // ===== OBTENER ESTADÍSTICAS DE REACCIONES =====
  static async getReactionStats(filters = {}) {
    const { dateFrom, dateTo, targetType } = filters;
    
    const matchFilters = {};
    if (dateFrom || dateTo) {
      matchFilters.createdAt = {};
      if (dateFrom) matchFilters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchFilters.createdAt.$lte = new Date(dateTo);
    }

    if (targetType) {
      matchFilters.targetType = targetType;
    }

    // Estadísticas generales
    const totalStats = await Reaction.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: null,
          totalReactions: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          uniqueTargets: { $addToSet: '$targetId' }
        }
      },
      {
        $project: {
          totalReactions: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          uniqueTargets: { $size: '$uniqueTargets' }
        }
      }
    ]);

    // Estadísticas por tipo de reacción
    const reactionTypeStats = await Reaction.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: '$reactionType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Estadísticas por tipo de objetivo
    const targetTypeStats = await Reaction.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: '$targetType',
          count: { $sum: 1 },
          uniqueTargets: { $addToSet: '$targetId' }
        }
      },
      {
        $project: {
          count: 1,
          uniqueTargets: { $size: '$uniqueTargets' }
        }
      }
    ]);

    const result = totalStats[0] || {
      totalReactions: 0,
      uniqueUsers: 0,
      uniqueTargets: 0
    };

    return {
      summary: result,
      byReactionType: reactionTypeStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      byTargetType: targetTypeStats.reduce((acc, stat) => {
        acc[stat._id] = {
          reactions: stat.count,
          uniqueTargets: stat.uniqueTargets
        };
        return acc;
      }, {})
    };
  }

  // ===== OBTENER REACCIONES RECIENTES =====
  static async getRecentReactions(limit = 10, targetType = null) {
    const filters = {};
    if (targetType) {
      filters.targetType = targetType;
    }

    const reactions = await Reaction.find(filters)
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return reactions.map(reaction => this.formatReactionData(reaction));
  }

  // ===== UTILITY METHODS =====

  // Verificar que el elemento objetivo exista
  static async verifyTargetExists(targetType, targetId) {
    let exists = false;

    switch (targetType) {
      case TARGET_TYPES.PRODUCT:
        const product = await Product.findById(targetId);
        exists = product && product.isActive;
        break;
      case TARGET_TYPES.POST:
        const post = await Post.findById(targetId);
        exists = !!post;
        break;
      case TARGET_TYPES.COMMENT:
        const comment = await Comment.findById(targetId);
        exists = !!comment;
        break;
      // Agregar más tipos según sea necesario
      default:
        throw new AppError('Tipo de objetivo no soportado', 400, 'UNSUPPORTED_TARGET_TYPE');
    }

    if (!exists) {
      throw new AppError('El elemento objetivo no existe o no está disponible', 404, 'TARGET_NOT_FOUND');
    }
  }

  // Formatear datos de reacción para respuesta
  static formatReactionData(reaction) {
    const formatted = {
      id: reaction._id,
      userId: reaction.userId._id || reaction.userId,
      targetType: reaction.targetType,
      targetId: reaction.targetId,
      reactionType: reaction.reactionType,
      createdAt: reaction.createdAt
    };

    // Agregar información del usuario si está poblada
    if (reaction.userId && reaction.userId.firstName) {
      formatted.user = {
        firstName: reaction.userId.firstName,
        lastName: reaction.userId.lastName
      };
    }

    return formatted;
  }

  // Verificar si un usuario reaccionó a un elemento
  static async hasUserReacted(userId, targetType, targetId) {
    const reaction = await Reaction.findOne({ userId, targetType, targetId });
    return reaction ? reaction.reactionType : null;
  }

  // Obtener usuarios que reaccionaron con un tipo específico
  static async getUsersWithReaction(targetType, targetId, reactionType, limit = 10) {
    const reactions = await Reaction.find({
      targetType,
      targetId,
      reactionType
    })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return reactions.map(reaction => ({
      userId: reaction.userId._id,
      user: {
        firstName: reaction.userId.firstName,
        lastName: reaction.userId.lastName
      },
      reactedAt: reaction.createdAt
    }));
  }

  // Eliminar todas las reacciones de un elemento (útil cuando se elimina el elemento)
  static async deleteTargetReactions(targetType, targetId) {
    const result = await Reaction.deleteMany({ targetType, targetId });
    return {
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} reacciones eliminadas`
    };
  }

  // Obtener tendencias de reacciones
  static async getReactionTrends(targetType, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pipeline = [
      { 
        $match: { 
          targetType,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            reactionType: '$reactionType'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ];

    const results = await Reaction.aggregate(pipeline);
    
    // Organizar datos por fecha
    const trends = {};
    results.forEach(result => {
      const date = result._id.date;
      if (!trends[date]) {
        trends[date] = {};
        Object.values(REACTION_TYPES).forEach(type => {
          trends[date][type] = 0;
        });
      }
      trends[date][result._id.reactionType] = result.count;
    });

    return trends;
  }
}

module.exports = ReactionService; 
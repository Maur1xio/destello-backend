const Follow = require('../models/Follow');
const User = require('../models/User');
const { AppError } = require('../middlewares/errorHandler');
const { calculatePagination } = require('../middlewares/responseFormatter');

class FollowService {
  // ===== SEGUIR USUARIO =====
  static async followUser(followerId, followedId) {
    // Verificar que no sea el mismo usuario
    if (followerId.toString() === followedId.toString()) {
      throw new AppError('No puedes seguirte a ti mismo', 400, 'CANNOT_FOLLOW_SELF');
    }

    // Verificar que el usuario a seguir exista
    const userToFollow = await User.findById(followedId);
    if (!userToFollow || !userToFollow.isActive) {
      throw new AppError('Usuario no encontrado o no activo', 404, 'USER_NOT_FOUND');
    }

    // Verificar que no esté ya siguiendo
    const existingFollow = await Follow.findOne({ followerId, followedId });
    if (existingFollow) {
      throw new AppError('Ya estás siguiendo a este usuario', 400, 'ALREADY_FOLLOWING');
    }

    // Crear seguimiento
    const follow = await Follow.create({
      followerId,
      followedId
    });

    return {
      id: follow._id,
      followerId: follow.followerId,
      followedId: follow.followedId,
      followedAt: follow.followedAt,
      isFollowing: true,
      user: {
        id: userToFollow._id,
        firstName: userToFollow.firstName,
        lastName: userToFollow.lastName,
        fullName: userToFollow.fullName
      }
    };
  }

  // ===== DEJAR DE SEGUIR =====
  static async unfollowUser(followerId, followedId) {
    // Buscar el seguimiento
    const follow = await Follow.findOne({ followerId, followedId });
    if (!follow) {
      throw new AppError('No estás siguiendo a este usuario', 400, 'NOT_FOLLOWING');
    }

    // Eliminar seguimiento
    await Follow.findByIdAndDelete(follow._id);

    // Obtener información del usuario
    const user = await User.findById(followedId).select('firstName lastName');

    return {
      followerId,
      followedId,
      isFollowing: false,
      user: user ? {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName
      } : null
    };
  }

  // ===== TOGGLE SEGUIMIENTO =====
  static async toggleFollow(followerId, followedId) {
    const existingFollow = await Follow.findOne({ followerId, followedId });
    
    if (existingFollow) {
      return await this.unfollowUser(followerId, followedId);
    } else {
      return await this.followUser(followerId, followedId);
    }
  }

  // ===== OBTENER SEGUIDOS =====
  static async getFollowing(userId, paginationData) {
    const { page, limit, sort = '-followedAt' } = paginationData;

    const filters = { followerId: userId };

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Follow.countDocuments(filters));

    // Obtener seguimientos
    const follows = await Follow.find(filters)
      .populate('followedId', 'firstName lastName email isActive')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    // Filtrar usuarios activos
    const activeFollows = follows.filter(follow => 
      follow.followedId && follow.followedId.isActive
    );

    return {
      following: activeFollows.map(follow => ({
        id: follow._id,
        followedAt: follow.followedAt,
        user: {
          id: follow.followedId._id,
          firstName: follow.followedId.firstName,
          lastName: follow.followedId.lastName,
          fullName: follow.followedId.fullName,
          email: follow.followedId.email
        }
      })),
      pagination: {
        ...pagination,
        total: activeFollows.length // Ajustar total por filtro de activos
      }
    };
  }

  // ===== OBTENER SEGUIDORES =====
  static async getFollowers(userId, paginationData) {
    const { page, limit, sort = '-followedAt' } = paginationData;

    const filters = { followedId: userId };

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Follow.countDocuments(filters));

    // Obtener seguidores
    const follows = await Follow.find(filters)
      .populate('followerId', 'firstName lastName email isActive')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    // Filtrar usuarios activos
    const activeFollows = follows.filter(follow => 
      follow.followerId && follow.followerId.isActive
    );

    return {
      followers: activeFollows.map(follow => ({
        id: follow._id,
        followedAt: follow.followedAt,
        user: {
          id: follow.followerId._id,
          firstName: follow.followerId.firstName,
          lastName: follow.followerId.lastName,
          fullName: follow.followerId.fullName,
          email: follow.followerId.email
        }
      })),
      pagination: {
        ...pagination,
        total: activeFollows.length
      }
    };
  }

  // ===== VERIFICAR SI SIGUE A USUARIO =====
  static async isFollowing(followerId, followedId) {
    const follow = await Follow.findOne({ followerId, followedId });
    return {
      isFollowing: !!follow,
      followedAt: follow?.followedAt || null
    };
  }

  // ===== OBTENER ESTADÍSTICAS DE SEGUIMIENTO =====
  static async getFollowStats(userId) {
    const [followingCount, followersCount] = await Promise.all([
      Follow.countDocuments({ followerId: userId }),
      Follow.countDocuments({ followedId: userId })
    ]);

    return {
      userId,
      followingCount,
      followersCount,
      ratio: followersCount > 0 ? (followingCount / followersCount).toFixed(2) : 0
    };
  }

  // ===== OBTENER CONEXIONES MUTUAS =====
  static async getMutualConnections(userId, targetUserId) {
    // Obtener usuarios que sigue el usuario actual
    const userFollowing = await Follow.find({ followerId: userId }).select('followedId');
    const userFollowingIds = userFollowing.map(f => f.followedId.toString());

    // Obtener usuarios que sigue el usuario objetivo
    const targetFollowing = await Follow.find({ followerId: targetUserId }).select('followedId');
    const targetFollowingIds = targetFollowing.map(f => f.followedId.toString());

    // Encontrar intersección
    const mutualIds = userFollowingIds.filter(id => targetFollowingIds.includes(id));

    // Obtener información de usuarios mutuos
    const mutualUsers = await User.find({ 
      _id: { $in: mutualIds }, 
      isActive: true 
    }).select('firstName lastName');

    return {
      count: mutualUsers.length,
      users: mutualUsers.map(user => ({
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName
      }))
    };
  }

  // ===== OBTENER SUGERENCIAS DE SEGUIMIENTO =====
  static async getFollowSuggestions(userId, limit = 10) {
    // Obtener usuarios que ya sigue
    const following = await Follow.find({ followerId: userId }).select('followedId');
    const followingIds = following.map(f => f.followedId.toString());
    followingIds.push(userId.toString()); // Excluir a sí mismo

    // 1. Usuarios seguidos por personas que el usuario sigue (amigos de amigos)
    const friendsOfFriends = await Follow.aggregate([
      { $match: { followerId: { $in: following.map(f => f.followedId) } } },
      { $match: { followedId: { $nin: followingIds } } },
      { 
        $group: { 
          _id: '$followedId', 
          mutualConnections: { $sum: 1 } 
        } 
      },
      { $sort: { mutualConnections: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const friendsOfFriendsIds = friendsOfFriends.map(f => f._id);

    // 2. Usuarios más activos recientemente (si no hay suficientes amigos de amigos)
    let additionalSuggestions = [];
    if (friendsOfFriendsIds.length < limit) {
      const remaining = limit - friendsOfFriendsIds.length;
      additionalSuggestions = await User.find({
        _id: { $nin: [...followingIds, ...friendsOfFriendsIds] },
        isActive: true
      })
        .sort({ lastLogin: -1, createdAt: -1 })
        .limit(remaining)
        .select('_id');
    }

    // Combinar y obtener información completa
    const allSuggestionIds = [
      ...friendsOfFriendsIds,
      ...additionalSuggestions.map(u => u._id)
    ];

    const suggestions = await User.find({
      _id: { $in: allSuggestionIds },
      isActive: true
    }).select('firstName lastName email createdAt');

    // Enriquecer con información adicional
    const enrichedSuggestions = await Promise.all(
      suggestions.map(async (user) => {
        const mutualCount = friendsOfFriends.find(
          f => f._id.toString() === user._id.toString()
        )?.mutualConnections || 0;

        return {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            email: user.email
          },
          reason: mutualCount > 0 ? 'mutual_connections' : 'active_user',
          mutualConnections: mutualCount,
          memberSince: user.createdAt
        };
      })
    );

    return enrichedSuggestions;
  }

  // ===== OBTENER ACTIVIDAD DE SEGUIMIENTO =====
  static async getFollowActivity(userId, paginationData) {
    const { page, limit, sort = '-followedAt' } = paginationData;

    // Obtener actividad reciente (nuevos seguimientos)
    const filters = { followerId: userId };

    const pagination = calculatePagination(page, limit, await Follow.countDocuments(filters));

    const recentFollows = await Follow.find(filters)
      .populate('followedId', 'firstName lastName')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      activity: recentFollows.map(follow => ({
        type: 'followed_user',
        id: follow._id,
        timestamp: follow.followedAt,
        user: {
          id: follow.followedId._id,
          firstName: follow.followedId.firstName,
          lastName: follow.followedId.lastName,
          fullName: follow.followedId.fullName
        }
      })),
      pagination
    };
  }

  // ===== OBTENER USUARIOS POPULARES =====
  static async getPopularUsers(limit = 10) {
    const pipeline = [
      {
        $group: {
          _id: '$followedId',
          followersCount: { $sum: 1 }
        }
      },
      { $sort: { followersCount: -1 } },
      { $limit: parseInt(limit) }
    ];

    const popularUserIds = await Follow.aggregate(pipeline);

    // Obtener información completa de usuarios
    const users = await User.find({
      _id: { $in: popularUserIds.map(p => p._id) },
      isActive: true
    }).select('firstName lastName email createdAt');

    return popularUserIds.map(popular => {
      const user = users.find(u => u._id.toString() === popular._id.toString());
      return {
        user: user ? {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          email: user.email
        } : null,
        followersCount: popular.followersCount
      };
    }).filter(item => item.user); // Filtrar usuarios nulos
  }

  // ===== LIMPIAR SEGUIMIENTOS INACTIVOS =====
  static async cleanInactiveFollows() {
    // Obtener usuarios inactivos
    const inactiveUsers = await User.find({ isActive: false }).select('_id');
    const inactiveUserIds = inactiveUsers.map(u => u._id);

    // Eliminar seguimientos donde el seguidor o seguido esté inactivo
    const result = await Follow.deleteMany({
      $or: [
        { followerId: { $in: inactiveUserIds } },
        { followedId: { $in: inactiveUserIds } }
      ]
    });

    return {
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} seguimientos inactivos eliminados`
    };
  }

  // ===== OBTENER ESTADÍSTICAS GENERALES (ADMIN) =====
  static async getGeneralFollowStats(filters = {}) {
    const { dateFrom, dateTo } = filters;
    
    const matchFilters = {};
    if (dateFrom || dateTo) {
      matchFilters.followedAt = {};
      if (dateFrom) matchFilters.followedAt.$gte = new Date(dateFrom);
      if (dateTo) matchFilters.followedAt.$lte = new Date(dateTo);
    }

    // Estadísticas generales
    const totalStats = await Follow.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: null,
          totalFollows: { $sum: 1 },
          uniqueFollowers: { $addToSet: '$followerId' },
          uniqueFollowed: { $addToSet: '$followedId' }
        }
      },
      {
        $project: {
          totalFollows: 1,
          uniqueFollowers: { $size: '$uniqueFollowers' },
          uniqueFollowed: { $size: '$uniqueFollowed' }
        }
      }
    ]);

    // Estadísticas por fecha
    const dateStats = await Follow.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$followedAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const result = totalStats[0] || {
      totalFollows: 0,
      uniqueFollowers: 0,
      uniqueFollowed: 0
    };

    return {
      summary: result,
      byDate: dateStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };
  }

  // ===== UTILITY METHODS =====

  // Verificar relación de seguimiento
  static async checkFollowRelationship(userId1, userId2) {
    const [isFollowing, isFollowedBy] = await Promise.all([
      Follow.findOne({ followerId: userId1, followedId: userId2 }),
      Follow.findOne({ followerId: userId2, followedId: userId1 })
    ]);

    return {
      isFollowing: !!isFollowing,
      isFollowedBy: !!isFollowedBy,
      isMutual: !!(isFollowing && isFollowedBy),
      followedAt: isFollowing?.followedAt || null,
      followedByAt: isFollowedBy?.followedAt || null
    };
  }

  // Obtener red de seguimiento extendida
  static async getExtendedNetwork(userId, depth = 2) {
    let currentLevel = [userId.toString()];
    let allConnections = new Set([userId.toString()]);
    const network = { [userId.toString()]: { level: 0, connections: [] } };

    for (let level = 1; level <= depth; level++) {
      const nextLevel = [];
      
      // Obtener conexiones del nivel actual
      const connections = await Follow.find({
        followerId: { $in: currentLevel }
      }).populate('followedId', 'firstName lastName isActive');

      for (const connection of connections) {
        if (!connection.followedId || !connection.followedId.isActive) continue;
        
        const connId = connection.followedId._id.toString();
        
        if (!allConnections.has(connId)) {
          allConnections.add(connId);
          nextLevel.push(connId);
          
          network[connId] = {
            level,
            user: {
              id: connection.followedId._id,
              firstName: connection.followedId.firstName,
              lastName: connection.followedId.lastName,
              fullName: connection.followedId.fullName
            },
            connections: []
          };
        }
        
        // Agregar conexión al nodo padre
        const followerId = connection.followerId.toString();
        if (network[followerId]) {
          network[followerId].connections.push(connId);
        }
      }
      
      currentLevel = nextLevel;
      if (currentLevel.length === 0) break;
    }

    return {
      userId,
      networkSize: allConnections.size - 1, // Excluir al usuario mismo
      maxDepth: depth,
      network
    };
  }

  // Encontrar camino más corto entre dos usuarios
  static async findShortestPath(fromUserId, toUserId, maxDepth = 4) {
    if (fromUserId.toString() === toUserId.toString()) {
      return { path: [fromUserId], length: 0 };
    }

    const visited = new Set();
    const queue = [{ userId: fromUserId.toString(), path: [fromUserId.toString()] }];
    
    while (queue.length > 0 && queue[0].path.length <= maxDepth) {
      const { userId, path } = queue.shift();
      
      if (visited.has(userId)) continue;
      visited.add(userId);
      
      // Obtener usuarios que sigue este usuario
      const follows = await Follow.find({ followerId: userId }).select('followedId');
      
      for (const follow of follows) {
        const nextUserId = follow.followedId.toString();
        
        if (nextUserId === toUserId.toString()) {
          return {
            path: [...path, nextUserId],
            length: path.length
          };
        }
        
        if (!visited.has(nextUserId)) {
          queue.push({
            userId: nextUserId,
            path: [...path, nextUserId]
          });
        }
      }
    }
    
    return { path: null, length: -1 }; // No hay camino
  }
}

module.exports = FollowService; 
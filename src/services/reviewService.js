const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { AppError } = require('../middlewares/errorHandler');
const { calculatePagination } = require('../middlewares/responseFormatter');
const { ORDER_STATUS } = require('../config/constants');

class ReviewService {
  // ===== CREAR RESEÑA =====
  static async createReview(userId, reviewData) {
    const { productId, orderId, rating, reviewText, title } = reviewData;

    // Verificar que el producto exista
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new AppError('Producto no encontrado o no disponible', 404, 'PRODUCT_NOT_AVAILABLE');
    }

    // Verificar que el usuario haya comprado el producto
    if (orderId) {
      const order = await Order.findOne({ 
        _id: orderId, 
        userId, 
        status: ORDER_STATUS.DELIVERED,
        'items.productId': productId 
      });
      
      if (!order) {
        throw new AppError('Solo puedes reseñar productos que hayas comprado y recibido', 403, 'PURCHASE_REQUIRED');
      }
    }

    // Verificar que no exista ya una reseña de este usuario para este producto
    const existingReview = await Review.findOne({ userId, productId });
    if (existingReview) {
      throw new AppError('Ya has reseñado este producto', 400, 'REVIEW_ALREADY_EXISTS');
    }

    // Crear reseña
    const review = await Review.create({
      userId,
      productId,
      orderId,
      rating: parseInt(rating),
      reviewText,
      title,
      helpfulCount: 0,
      verifiedPurchase: !!orderId
    });

    // Poblar para respuesta
    await review.populate([
      { path: 'userId', select: 'firstName lastName' },
      { path: 'productId', select: 'name sku' }
    ]);

    // Actualizar estadísticas del producto
    await this.updateProductRatingStats(productId);

    return this.formatReviewData(review, true);
  }

  // ===== OBTENER RESEÑAS DE PRODUCTO =====
  static async getProductReviews(productId, paginationData, filters = {}) {
    const { page, limit, sort = '-createdAt' } = paginationData;
    const { rating, verifiedOnly } = filters;

    // Verificar que el producto exista
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // Construir filtros
    const searchFilters = { productId };

    if (rating) {
      searchFilters.rating = parseInt(rating);
    }

    if (verifiedOnly === 'true') {
      searchFilters.verifiedPurchase = true;
    }

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Review.countDocuments(searchFilters));

    // Obtener reseñas
    const reviews = await Review.find(searchFilters)
      .populate('userId', 'firstName lastName')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    // Obtener estadísticas del producto
    const stats = await this.getProductReviewStats(productId);

    return {
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku
      },
      reviews: reviews.map(review => this.formatReviewData(review)),
      pagination,
      stats
    };
  }

  // ===== OBTENER RESEÑA POR ID =====
  static async getReviewById(reviewId) {
    const review = await Review.findById(reviewId)
      .populate('userId', 'firstName lastName')
      .populate('productId', 'name sku');

    if (!review) {
      throw new AppError('Reseña no encontrada', 404, 'REVIEW_NOT_FOUND');
    }

    return this.formatReviewData(review, true);
  }

  // ===== OBTENER RESEÑAS DEL USUARIO =====
  static async getUserReviews(userId, paginationData) {
    const { page, limit, sort = '-createdAt' } = paginationData;

    const filters = { userId };

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Review.countDocuments(filters));

    // Obtener reseñas
    const reviews = await Review.find(filters)
      .populate('productId', 'name sku price')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      reviews: reviews.map(review => this.formatReviewData(review)),
      pagination
    };
  }

  // ===== ACTUALIZAR RESEÑA =====
  static async updateReview(reviewId, userId, updateData) {
    const { rating, reviewText, title } = updateData;

    const review = await Review.findById(reviewId);
    if (!review) {
      throw new AppError('Reseña no encontrada', 404, 'REVIEW_NOT_FOUND');
    }

    // Verificar que el usuario sea el autor
    if (review.userId.toString() !== userId.toString()) {
      throw new AppError('Solo puedes editar tus propias reseñas', 403, 'NOT_REVIEW_AUTHOR');
    }

    // Actualizar campos
    if (rating !== undefined) review.rating = parseInt(rating);
    if (reviewText !== undefined) review.reviewText = reviewText;
    if (title !== undefined) review.title = title;

    await review.save();

    // Poblar para respuesta
    await review.populate([
      { path: 'userId', select: 'firstName lastName' },
      { path: 'productId', select: 'name sku' }
    ]);

    // Actualizar estadísticas del producto si cambió el rating
    if (rating !== undefined && rating !== review.rating) {
      await this.updateProductRatingStats(review.productId);
    }

    return this.formatReviewData(review, true);
  }

  // ===== ELIMINAR RESEÑA =====
  static async deleteReview(reviewId, userId, userRole = null) {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new AppError('Reseña no encontrada', 404, 'REVIEW_NOT_FOUND');
    }

    // Verificar permisos
    if (userRole !== 'admin' && review.userId.toString() !== userId.toString()) {
      throw new AppError('Solo puedes eliminar tus propias reseñas', 403, 'NOT_REVIEW_AUTHOR');
    }

    const productId = review.productId;
    await Review.findByIdAndDelete(reviewId);

    // Actualizar estadísticas del producto
    await this.updateProductRatingStats(productId);

    return { message: 'Reseña eliminada exitosamente' };
  }

  // ===== MARCAR RESEÑA COMO ÚTIL =====
  static async markReviewHelpful(reviewId, userId) {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new AppError('Reseña no encontrada', 404, 'REVIEW_NOT_FOUND');
    }

    // No permitir que el autor marque su propia reseña como útil
    if (review.userId.toString() === userId.toString()) {
      throw new AppError('No puedes marcar tu propia reseña como útil', 400, 'CANNOT_MARK_OWN_REVIEW');
    }

    // Verificar si ya marcó esta reseña como útil
    if (review.helpfulVotes.includes(userId)) {
      throw new AppError('Ya marcaste esta reseña como útil', 400, 'ALREADY_MARKED_HELPFUL');
    }

    // Agregar voto y actualizar contador
    review.helpfulVotes.push(userId);
    await review.save();

    return {
      reviewId: review._id,
      helpfulCount: review.helpfulCount,
      marked: true
    };
  }

  // ===== QUITAR MARCA DE ÚTIL =====
  static async unmarkReviewHelpful(reviewId, userId) {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new AppError('Reseña no encontrada', 404, 'REVIEW_NOT_FOUND');
    }

    // Verificar si había marcado la reseña como útil
    const voteIndex = review.helpfulVotes.indexOf(userId);
    if (voteIndex === -1) {
      throw new AppError('No habías marcado esta reseña como útil', 400, 'NOT_MARKED_HELPFUL');
    }

    // Remover voto
    review.helpfulVotes.splice(voteIndex, 1);
    await review.save();

    return {
      reviewId: review._id,
      helpfulCount: review.helpfulCount,
      marked: false
    };
  }

  // ===== OBTENER TODAS LAS RESEÑAS (ADMIN) =====
  static async getAllReviews(filters, paginationData) {
    const { 
      page, 
      limit, 
      sort = '-createdAt',
      rating,
      verifiedOnly,
      dateFrom,
      dateTo,
      search
    } = { ...filters, ...paginationData };

    // Construir filtros
    const searchFilters = {};

    if (rating) {
      searchFilters.rating = parseInt(rating);
    }

    if (verifiedOnly === 'true') {
      searchFilters.verifiedPurchase = true;
    }

    if (dateFrom || dateTo) {
      searchFilters.createdAt = {};
      if (dateFrom) searchFilters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) searchFilters.createdAt.$lte = new Date(dateTo);
    }

    if (search) {
      searchFilters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { reviewText: { $regex: search, $options: 'i' } }
      ];
    }

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Review.countDocuments(searchFilters));

    // Obtener reseñas
    const reviews = await Review.find(searchFilters)
      .populate('userId', 'firstName lastName email')
      .populate('productId', 'name sku')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      reviews: reviews.map(review => this.formatReviewData(review)),
      pagination
    };
  }

  // ===== OBTENER ESTADÍSTICAS DE RESEÑAS DEL PRODUCTO =====
  static async getProductReviewStats(productId) {
    const stats = await Review.aggregate([
      { $match: { productId: productId } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          ratingDistribution: {
            $push: '$rating'
          },
          verifiedReviews: {
            $sum: { $cond: ['$verifiedPurchase', 1, 0] }
          },
          totalHelpfulVotes: { $sum: '$helpfulCount' }
        }
      }
    ]);

    if (!stats.length) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedReviews: 0,
        verificationRate: 0,
        totalHelpfulVotes: 0
      };
    }

    const stat = stats[0];
    
    // Calcular distribución por rating
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    stat.ratingDistribution.forEach(rating => {
      distribution[rating]++;
    });

    return {
      totalReviews: stat.totalReviews,
      averageRating: Math.round(stat.averageRating * 10) / 10, // Redondear a 1 decimal
      ratingDistribution: distribution,
      verifiedReviews: stat.verifiedReviews,
      verificationRate: stat.totalReviews > 0 ? 
        Math.round((stat.verifiedReviews / stat.totalReviews) * 100) : 0,
      totalHelpfulVotes: stat.totalHelpfulVotes
    };
  }

  // ===== OBTENER MEJORES RESEÑAS =====
  static async getTopReviews(limit = 10) {
    const reviews = await Review.find({})
      .populate('userId', 'firstName lastName')
      .populate('productId', 'name sku')
      .sort({ helpfulCount: -1, rating: -1 })
      .limit(parseInt(limit));

    return reviews.map(review => this.formatReviewData(review));
  }

  // ===== OBTENER RESEÑAS RECIENTES =====
  static async getRecentReviews(limit = 10) {
    const reviews = await Review.find({})
      .populate('userId', 'firstName lastName')
      .populate('productId', 'name sku')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return reviews.map(review => this.formatReviewData(review));
  }

  // ===== VERIFICAR SI USUARIO PUEDE RESEÑAR =====
  static async canUserReviewProduct(userId, productId) {
    // Verificar si ya reseñó el producto
    const existingReview = await Review.findOne({ userId, productId });
    if (existingReview) {
      return {
        canReview: false,
        reason: 'Ya has reseñado este producto',
        existingReview: existingReview._id
      };
    }

    // Verificar si compró el producto
    const order = await Order.findOne({
      userId,
      status: ORDER_STATUS.DELIVERED,
      'items.productId': productId
    });

    return {
      canReview: true,
      hasPurchased: !!order,
      orderId: order?._id
    };
  }

  // ===== OBTENER ESTADÍSTICAS GENERALES (ADMIN) =====
  static async getReviewsGeneralStats(filters = {}) {
    const { dateFrom, dateTo } = filters;
    
    const matchFilters = {};
    if (dateFrom || dateTo) {
      matchFilters.createdAt = {};
      if (dateFrom) matchFilters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchFilters.createdAt.$lte = new Date(dateTo);
    }

    const stats = await Review.aggregate([
      { $match: matchFilters },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          verifiedReviews: {
            $sum: { $cond: ['$verifiedPurchase', 1, 0] }
          },
          totalHelpfulVotes: { $sum: '$helpfulCount' },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    if (!stats.length) {
      return {
        totalReviews: 0,
        averageRating: 0,
        verificationRate: 0,
        totalHelpfulVotes: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const stat = stats[0];
    
    // Calcular distribución por rating
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    stat.ratingDistribution.forEach(rating => {
      distribution[rating]++;
    });

    return {
      totalReviews: stat.totalReviews,
      averageRating: Math.round(stat.averageRating * 10) / 10,
      verificationRate: stat.totalReviews > 0 ? 
        Math.round((stat.verifiedReviews / stat.totalReviews) * 100) : 0,
      totalHelpfulVotes: stat.totalHelpfulVotes,
      ratingDistribution: distribution
    };
  }

  // ===== UTILITY METHODS =====

  // Actualizar estadísticas de rating del producto
  static async updateProductRatingStats(productId) {
    const stats = await this.getProductReviewStats(productId);
    
    // Aquí podrías actualizar el modelo Product con las estadísticas
    // await Product.findByIdAndUpdate(productId, {
    //   reviewCount: stats.totalReviews,
    //   averageRating: stats.averageRating
    // });
  }

  // Formatear datos de reseña para respuesta
  static formatReviewData(review, includeDetails = false) {
    const formatted = {
      id: review._id,
      userId: review.userId._id || review.userId,
      productId: review.productId._id || review.productId,
      rating: review.rating,
      title: review.title,
      reviewText: review.reviewText,
      helpfulCount: review.helpfulCount,
      verifiedPurchase: review.verifiedPurchase,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    };

    // Agregar información del usuario si está poblada
    if (review.userId && review.userId.firstName) {
      formatted.user = {
        firstName: review.userId.firstName,
        lastName: review.userId.lastName
      };
    }

    // Agregar información del producto si está poblada
    if (review.productId && review.productId.name) {
      formatted.product = {
        name: review.productId.name,
        sku: review.productId.sku
      };
    }

    if (includeDetails) {
      formatted.orderId = review.orderId;
      formatted.helpfulVotes = review.helpfulVotes;
    }

    return formatted;
  }

  // Verificar si un usuario marcó una reseña como útil
  static async hasUserMarkedHelpful(reviewId, userId) {
    const review = await Review.findById(reviewId).select('helpfulVotes');
    return review && review.helpfulVotes.includes(userId);
  }
}

module.exports = ReviewService; 
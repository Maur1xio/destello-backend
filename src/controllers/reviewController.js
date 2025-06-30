const Joi = require('joi');
const reviewService = require('../services/reviewService');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');

// Schemas de validación
const schemas = {
  createReview: Joi.object({
    product: Joi.string().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().max(200).required(),
    comment: Joi.string().max(2000).required(),
    pros: Joi.array().items(Joi.string().max(100)).max(5).optional(),
    cons: Joi.array().items(Joi.string().max(100)).max(5).optional()
  }),
  updateReview: Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    title: Joi.string().max(200).optional(),
    comment: Joi.string().max(2000).optional(),
    pros: Joi.array().items(Joi.string().max(100)).max(5).optional(),
    cons: Joi.array().items(Joi.string().max(100)).max(5).optional()
  }),
  markHelpful: Joi.object({
    helpful: Joi.boolean().required()
  })
};

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Gestión de reseñas de productos
 */

const createReview = asyncHandler(async (req, res) => {
  const { error, value } = schemas.createReview.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const review = await reviewService.createReview({
    ...value,
    user: req.user._id
  });
  
  res.status(201).json({
    success: true,
    message: 'Reseña creada exitosamente',
    data: review
  });
});

const getReview = asyncHandler(async (req, res) => {
  const review = await reviewService.getReviewById(req.params.id);
  
  res.json({
    success: true,
    data: review
  });
});

const getProductReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort = '-createdAt', rating } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    rating: rating ? parseInt(rating) : undefined
  };
  
  const reviews = await reviewService.getProductReviews(req.params.productId, options);
  
  res.json({
    success: true,
    data: reviews
  });
});

const getUserReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort
  };
  
  const reviews = await reviewService.getUserReviews(req.user._id, options);
  
  res.json({
    success: true,
    data: reviews
  });
});

const updateReview = asyncHandler(async (req, res) => {
  const { error, value } = schemas.updateReview.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const review = await reviewService.updateReview(req.params.id, req.user._id, value);
  
  res.json({
    success: true,
    message: 'Reseña actualizada exitosamente',
    data: review
  });
});

const deleteReview = asyncHandler(async (req, res) => {
  await reviewService.deleteReview(req.params.id, req.user._id);
  
  res.json({
    success: true,
    message: 'Reseña eliminada exitosamente'
  });
});

const markHelpful = asyncHandler(async (req, res) => {
  const { error, value } = schemas.markHelpful.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const result = await reviewService.markHelpful(req.params.id, req.user._id, value.helpful);
  
  res.json({
    success: true,
    message: value.helpful ? 'Reseña marcada como útil' : 'Marca de útil removida',
    data: result
  });
});

const getReviewStats = asyncHandler(async (req, res) => {
  const stats = await reviewService.getProductReviewStats(req.params.productId);
  
  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  createReview,
  getReview,
  getProductReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  markHelpful,
  getReviewStats
}; 
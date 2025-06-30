const Joi = require('joi');
const reactionService = require('../services/reactionService');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const { REACTION_TYPES, TARGET_TYPES } = require('../config/constants');

// Schemas de validación
const schemas = {
  createReaction: Joi.object({
    targetType: Joi.string().valid(...Object.values(TARGET_TYPES)).required(),
    targetId: Joi.string().required(),
    type: Joi.string().valid(...Object.values(REACTION_TYPES)).required()
  })
};

/**
 * @swagger
 * tags:
 *   name: Reactions
 *   description: Gestión de reacciones universales
 */

const createReaction = asyncHandler(async (req, res) => {
  const { error, value } = schemas.createReaction.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const reaction = await reactionService.createReaction({
    ...value,
    user: req.user._id
  });
  
  res.status(201).json({
    success: true,
    message: 'Reacción agregada exitosamente',
    data: reaction
  });
});

const removeReaction = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.query;
  
  if (!targetType || !targetId) {
    throw new AppError('targetType y targetId son requeridos', 400);
  }
  
  await reactionService.removeReaction(req.user._id, targetType, targetId);
  
  res.json({
    success: true,
    message: 'Reacción removida exitosamente'
  });
});

const toggleReaction = asyncHandler(async (req, res) => {
  const { error, value } = schemas.createReaction.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const result = await reactionService.toggleReaction(req.user._id, value);
  
  res.json({
    success: true,
    message: result.action === 'added' ? 'Reacción agregada' : 'Reacción removida',
    data: result
  });
});

const getReactions = asyncHandler(async (req, res) => {
  const { targetType, targetId, type, page = 1, limit = 10 } = req.query;
  
  if (!targetType || !targetId) {
    throw new AppError('targetType y targetId son requeridos', 400);
  }
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    type
  };
  
  const reactions = await reactionService.getReactions(targetType, targetId, options);
  
  res.json({
    success: true,
    data: reactions
  });
});

const getUserReactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, type, targetType } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    type,
    targetType
  };
  
  const reactions = await reactionService.getUserReactions(req.user._id, options);
  
  res.json({
    success: true,
    data: reactions
  });
});

const getReactionStats = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.query;
  
  if (!targetType || !targetId) {
    throw new AppError('targetType y targetId son requeridos', 400);
  }
  
  const stats = await reactionService.getReactionStats(targetType, targetId);
  
  res.json({
    success: true,
    data: stats
  });
});

const getUserReactionStatus = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.query;
  
  if (!targetType || !targetId) {
    throw new AppError('targetType y targetId son requeridos', 400);
  }
  
  const status = await reactionService.getUserReactionStatus(req.user._id, targetType, targetId);
  
  res.json({
    success: true,
    data: status
  });
});

module.exports = {
  createReaction,
  removeReaction,
  toggleReaction,
  getReactions,
  getUserReactions,
  getReactionStats,
  getUserReactionStatus
}; 
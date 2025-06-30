const Joi = require('joi');
const commentService = require('../services/commentService');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const { TARGET_TYPES } = require('../config/constants');

// Schemas de validación
const schemas = {
  createComment: Joi.object({
    parentType: Joi.string().valid(...Object.values(TARGET_TYPES)).required(),
    parentId: Joi.string().required(),
    content: Joi.string().max(2000).required(),
    parentCommentId: Joi.string().optional()
  }),
  updateComment: Joi.object({
    content: Joi.string().max(2000).required()
  })
};

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Gestión de comentarios genéricos
 */

const createComment = asyncHandler(async (req, res) => {
  const { error, value } = schemas.createComment.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const comment = await commentService.createComment({
    ...value,
    author: req.user._id
  });
  
  res.status(201).json({
    success: true,
    message: 'Comentario creado exitosamente',
    data: comment
  });
});

const getComment = asyncHandler(async (req, res) => {
  const comment = await commentService.getCommentById(req.params.id);
  
  res.json({
    success: true,
    data: comment
  });
});

const getComments = asyncHandler(async (req, res) => {
  const { parentType, parentId, page = 1, limit = 10, sort = '-createdAt' } = req.query;
  
  if (!parentType || !parentId) {
    throw new AppError('parentType y parentId son requeridos', 400);
  }
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort
  };
  
  const comments = await commentService.getComments(parentType, parentId, options);
  
  res.json({
    success: true,
    data: comments
  });
});

const getReplies = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort = 'createdAt' } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort
  };
  
  const replies = await commentService.getReplies(req.params.commentId, options);
  
  res.json({
    success: true,
    data: replies
  });
});

const getUserComments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort
  };
  
  const comments = await commentService.getUserComments(req.user._id, options);
  
  res.json({
    success: true,
    data: comments
  });
});

const updateComment = asyncHandler(async (req, res) => {
  const { error, value } = schemas.updateComment.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const comment = await commentService.updateComment(req.params.id, req.user._id, value);
  
  res.json({
    success: true,
    message: 'Comentario actualizado exitosamente',
    data: comment
  });
});

const deleteComment = asyncHandler(async (req, res) => {
  await commentService.deleteComment(req.params.id, req.user._id);
  
  res.json({
    success: true,
    message: 'Comentario eliminado exitosamente'
  });
});

const getCommentStats = asyncHandler(async (req, res) => {
  const { parentType, parentId } = req.query;
  
  if (!parentType || !parentId) {
    throw new AppError('parentType y parentId son requeridos', 400);
  }
  
  const stats = await commentService.getCommentStats(parentType, parentId);
  
  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  createComment,
  getComment,
  getComments,
  getReplies,
  getUserComments,
  updateComment,
  deleteComment,
  getCommentStats
}; 
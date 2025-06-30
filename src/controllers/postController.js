const Joi = require('joi');
const postService = require('../services/postService');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');

// Schemas de validación
const schemas = {
  createPost: Joi.object({
    title: Joi.string().max(200).required(),
    content: Joi.string().max(5000).required(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    isPublic: Joi.boolean().default(true),
    allowComments: Joi.boolean().default(true)
  }),
  updatePost: Joi.object({
    title: Joi.string().max(200).optional(),
    content: Joi.string().max(5000).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    isPublic: Joi.boolean().optional(),
    allowComments: Joi.boolean().optional()
  })
};

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Gestión de posts del sistema social
 */

const createPost = asyncHandler(async (req, res) => {
  const { error, value } = schemas.createPost.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const post = await postService.createPost({
    ...value,
    author: req.user._id
  });
  
  res.status(201).json({
    success: true,
    message: 'Post creado exitosamente',
    data: post
  });
});

const getPost = asyncHandler(async (req, res) => {
  const post = await postService.getPostById(req.params.id, req.user?._id);
  
  res.json({
    success: true,
    data: post
  });
});

const getPosts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, tag, sort = '-createdAt', author } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    tag,
    author,
    userId: req.user?._id
  };
  
  const posts = await postService.getPosts(options);
  
  res.json({
    success: true,
    data: posts
  });
});

const getUserPosts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort
  };
  
  const posts = await postService.getUserPosts(req.user._id, options);
  
  res.json({
    success: true,
    data: posts
  });
});

const getFollowingPosts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort
  };
  
  const posts = await postService.getFollowingPosts(req.user._id, options);
  
  res.json({
    success: true,
    data: posts
  });
});

const updatePost = asyncHandler(async (req, res) => {
  const { error, value } = schemas.updatePost.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const post = await postService.updatePost(req.params.id, req.user._id, value);
  
  res.json({
    success: true,
    message: 'Post actualizado exitosamente',
    data: post
  });
});

const deletePost = asyncHandler(async (req, res) => {
  await postService.deletePost(req.params.id, req.user._id);
  
  res.json({
    success: true,
    message: 'Post eliminado exitosamente'
  });
});

const getPostsByTag = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort
  };
  
  const posts = await postService.getPostsByTag(req.params.tag, options);
  
  res.json({
    success: true,
    data: posts
  });
});

const searchPosts = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 10, sort = '-createdAt' } = req.query;
  
  if (!q) {
    throw new AppError('Parámetro de búsqueda requerido', 400);
  }
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    userId: req.user?._id
  };
  
  const results = await postService.searchPosts(q, options);
  
  res.json({
    success: true,
    data: results
  });
});

const getTrendingPosts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, period = 'week' } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    period,
    userId: req.user?._id
  };
  
  const posts = await postService.getTrendingPosts(options);
  
  res.json({
    success: true,
    data: posts
  });
});

module.exports = {
  createPost,
  getPost,
  getPosts,
  getUserPosts,
  getFollowingPosts,
  updatePost,
  deletePost,
  getPostsByTag,
  searchPosts,
  getTrendingPosts
}; 
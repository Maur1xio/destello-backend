const Joi = require('joi');
const followService = require('../services/followService');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');

// Schemas de validación
const schemas = {
  followUser: Joi.object({
    userId: Joi.string().required()
  })
};

/**
 * @swagger
 * tags:
 *   name: Follows
 *   description: Gestión de seguimientos y red social
 */

const followUser = asyncHandler(async (req, res) => {
  const { error, value } = schemas.followUser.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400);

  const follow = await followService.followUser(req.user._id, value.userId);
  
  res.status(201).json({
    success: true,
    message: 'Usuario seguido exitosamente',
    data: follow
  });
});

const unfollowUser = asyncHandler(async (req, res) => {
  await followService.unfollowUser(req.user._id, req.params.userId);
  
  res.json({
    success: true,
    message: 'Usuario dejado de seguir exitosamente'
  });
});

const getFollowers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
  const userId = req.params.userId || req.user._id;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort
  };
  
  const followers = await followService.getFollowers(userId, options);
  
  res.json({
    success: true,
    data: followers
  });
});

const getFollowing = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
  const userId = req.params.userId || req.user._id;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort
  };
  
  const following = await followService.getFollowing(userId, options);
  
  res.json({
    success: true,
    data: following
  });
});

const getFollowStats = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id;
  
  const stats = await followService.getFollowStats(userId);
  
  res.json({
    success: true,
    data: stats
  });
});

const getSuggestedUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit)
  };
  
  const suggestions = await followService.getSuggestedUsers(req.user._id, options);
  
  res.json({
    success: true,
    data: suggestions
  });
});

module.exports = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStats,
  getSuggestedUsers
}; 
const mongoose = require('mongoose');

const FollowSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario que sigue es requerido']
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario seguido es requerido']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ===== VALIDATIONS =====
FollowSchema.pre('save', function(next) {
  // Un usuario no puede seguirse a sí mismo
  if (this.userId.toString() === this.targetUserId.toString()) {
    const error = new Error('Un usuario no puede seguirse a sí mismo');
    return next(error);
  }
  next();
});

// ===== STATICS =====
FollowSchema.statics.getFollowersCount = function(userId) {
  return this.countDocuments({ targetUserId: userId });
};

FollowSchema.statics.getFollowingCount = function(userId) {
  return this.countDocuments({ userId: userId });
};

FollowSchema.statics.isFollowing = function(userId, targetUserId) {
  return this.findOne({ userId: userId, targetUserId: targetUserId });
};

FollowSchema.statics.toggleFollow = async function(userId, targetUserId) {
  const existingFollow = await this.findOne({
    userId: userId,
    targetUserId: targetUserId
  });

  if (existingFollow) {
    await existingFollow.deleteOne();
    return { action: 'unfollowed', isFollowing: false };
  } else {
    const newFollow = await this.create({
      userId: userId,
      targetUserId: targetUserId
    });
    return { action: 'followed', isFollowing: true, follow: newFollow };
  }
};

FollowSchema.statics.getFollowers = function(userId, limit = 20, skip = 0) {
  return this.find({ targetUserId: userId })
    .populate('userId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

FollowSchema.statics.getFollowing = function(userId, limit = 20, skip = 0) {
  return this.find({ userId: userId })
    .populate('targetUserId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

FollowSchema.statics.getMutualFollows = async function(userId1, userId2) {
  const user1Following = await this.find({ userId: userId1 }).select('targetUserId');
  const user2Following = await this.find({ userId: userId2 }).select('targetUserId');
  
  const user1FollowingIds = user1Following.map(f => f.targetUserId.toString());
  const user2FollowingIds = user2Following.map(f => f.targetUserId.toString());
  
  const mutualIds = user1FollowingIds.filter(id => user2FollowingIds.includes(id));
  
  return this.find({ targetUserId: { $in: mutualIds } })
    .populate('targetUserId', 'firstName lastName email')
    .limit(10);
};

// ===== INDEXES =====
FollowSchema.index({ userId: 1, targetUserId: 1 }, { unique: true }); // Un usuario solo puede seguir una vez a otro
FollowSchema.index({ userId: 1, createdAt: -1 });
FollowSchema.index({ targetUserId: 1, createdAt: -1 });

module.exports = mongoose.model('Follow', FollowSchema); 
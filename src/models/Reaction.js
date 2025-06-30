const mongoose = require('mongoose');
const { TARGET_TYPES, REACTION_TYPES } = require('../config/constants');

const ReactionSchema = new mongoose.Schema({
  targetType: {
    type: String,
    enum: Object.values(TARGET_TYPES),
    required: [true, 'El tipo de objetivo es requerido']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'El ID del objetivo es requerido']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es requerido']
  },
  type: {
    type: String,
    enum: Object.values(REACTION_TYPES),
    required: [true, 'El tipo de reacción es requerido']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ===== STATICS =====
ReactionSchema.statics.getReactionCounts = function(targetType, targetId) {
  return this.aggregate([
    {
      $match: {
        targetType: targetType,
        targetId: new mongoose.Types.ObjectId(targetId)
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);
};

ReactionSchema.statics.getUserReaction = function(targetType, targetId, userId) {
  return this.findOne({
    targetType: targetType,
    targetId: targetId,
    userId: userId
  });
};

ReactionSchema.statics.toggleReaction = async function(targetType, targetId, userId, reactionType) {
  const existingReaction = await this.findOne({
    targetType: targetType,
    targetId: targetId,
    userId: userId
  });

  if (existingReaction) {
    if (existingReaction.type === reactionType) {
      // Quitar la reacción si es la misma
      await existingReaction.deleteOne();
      return { action: 'removed', reaction: null };
    } else {
      // Cambiar el tipo de reacción
      existingReaction.type = reactionType;
      await existingReaction.save();
      return { action: 'changed', reaction: existingReaction };
    }
  } else {
    // Crear nueva reacción
    const newReaction = await this.create({
      targetType,
      targetId,
      userId,
      type: reactionType
    });
    return { action: 'added', reaction: newReaction };
  }
};

// ===== MIDDLEWARES =====
ReactionSchema.pre('save', function(next) {
  // Validar que el targetId existe según el targetType
  if (this.isNew) {
    const ModelMap = {
      'product': 'Product',
      'review': 'Review',
      'comment': 'Comment',
      'post': 'Post'
    };

    const ModelName = ModelMap[this.targetType];
    if (ModelName) {
      const Model = mongoose.model(ModelName);
      Model.findById(this.targetId)
        .then(doc => {
          if (!doc) {
            throw new Error(`${ModelName} con ID ${this.targetId} no existe`);
          }
          next();
        })
        .catch(err => next(err));
    } else {
      next();
    }
  } else {
    next();
  }
});

// ===== INDEXES =====
ReactionSchema.index({ targetType: 1, targetId: 1, type: 1 });
ReactionSchema.index({ userId: 1, createdAt: -1 });
ReactionSchema.index({ targetType: 1, targetId: 1, userId: 1 }, { unique: true }); // Un usuario, una reacción por objetivo

module.exports = mongoose.model('Reaction', ReactionSchema); 
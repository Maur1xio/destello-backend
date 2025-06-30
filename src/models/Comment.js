const mongoose = require('mongoose');
const { TARGET_TYPES } = require('../config/constants');

const CommentSchema = new mongoose.Schema({
  parentType: {
    type: String,
    enum: Object.values(TARGET_TYPES),
    required: [true, 'El tipo de padre es requerido']
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'El ID del padre es requerido']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es requerido']
  },
  text: {
    type: String,
    required: [true, 'El texto del comentario es requerido'],
    trim: true,
    maxlength: [1000, 'El comentario no puede exceder 1000 caracteres']
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== VIRTUALS =====
CommentSchema.virtual('reactions', {
  ref: 'Reaction',
  localField: '_id',
  foreignField: 'targetId',
  match: { targetType: 'comment' }
});

CommentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
  match: { parentType: 'comment' }
});

// ===== METHODS =====
CommentSchema.methods.editText = function(newText) {
  this.text = newText;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// ===== MIDDLEWARES =====
CommentSchema.pre('save', function(next) {
  // Validar que el parentId existe según el parentType
  if (this.isNew) {
    const ModelMap = {
      'product': 'Product',
      'review': 'Review',
      'comment': 'Comment',
      'post': 'Post'
    };

    const ModelName = ModelMap[this.parentType];
    if (ModelName) {
      const Model = mongoose.model(ModelName);
      Model.findById(this.parentId)
        .then(doc => {
          if (!doc) {
            throw new Error(`${ModelName} con ID ${this.parentId} no existe`);
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
CommentSchema.index({ parentType: 1, parentId: 1, createdAt: -1 });
CommentSchema.index({ userId: 1, createdAt: -1 });
CommentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Comment', CommentSchema); 
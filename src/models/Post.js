const mongoose = require('mongoose');

// ===== MAIN POST SCHEMA =====
const PostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es requerido']
  },
  text: {
    type: String,
    required: [true, 'El texto del post es requerido'],
    trim: true,
    maxlength: [2000, 'El post no puede exceder 2000 caracteres']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Los tags no pueden exceder 50 caracteres']
  }],
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
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== VIRTUALS =====
PostSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
  match: { parentType: 'post' }
});

PostSchema.virtual('reactions', {
  ref: 'Reaction',
  localField: '_id',
  foreignField: 'targetId',
  match: { targetType: 'post' }
});

PostSchema.virtual('hasTags').get(function() {
  return this.tags && this.tags.length > 0;
});

// ===== METHODS =====
PostSchema.methods.editContent = function(newText, newTags = []) {
  this.text = newText;
  this.tags = newTags;
  this.isEdited = true;
  this.editedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

PostSchema.methods.addTag = function(tag) {
  const cleanTag = tag.toLowerCase().trim();
  if (!this.tags.includes(cleanTag)) {
    this.tags.push(cleanTag);
    this.updatedAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

PostSchema.methods.removeTag = function(tag) {
  const cleanTag = tag.toLowerCase().trim();
  this.tags = this.tags.filter(t => t !== cleanTag);
  this.updatedAt = new Date();
  return this.save();
};

// ===== MIDDLEWARES =====
PostSchema.pre('save', function(next) {
  // Limpiar y validar tags
  if (this.tags && this.tags.length > 0) {
    this.tags = this.tags
      .map(tag => tag.toLowerCase().trim())
      .filter(tag => tag.length > 0)
      .filter((tag, index, arr) => arr.indexOf(tag) === index); // Eliminar duplicados
  }
  
  next();
});

// ===== INDEXES =====
PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ updatedAt: -1 });
PostSchema.index({ text: 'text' }); // Búsqueda de texto completo

module.exports = mongoose.model('Post', PostSchema); 
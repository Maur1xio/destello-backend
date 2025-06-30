// Exportar todos los modelos para facilitar las importaciones
const User = require('./User');
const Product = require('./Product');
const Category = require('./Category');
const Cart = require('./Cart');
const Order = require('./Order');
const Wishlist = require('./Wishlist');
const Review = require('./Review');
const Shipment = require('./Shipment');
const InventoryTransaction = require('./InventoryTransaction');
const Post = require('./Post');
const Comment = require('./Comment');
const Reaction = require('./Reaction');
const Follow = require('./Follow');

module.exports = {
  User,
  Product,
  Category,
  Cart,
  Order,
  Wishlist,
  Review,
  Shipment,
  InventoryTransaction,
  Post,
  Comment,
  Reaction,
  Follow
}; 
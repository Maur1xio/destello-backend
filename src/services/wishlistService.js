const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const { AppError } = require('../middlewares/errorHandler');

class WishlistService {
  // ===== OBTENER O CREAR WISHLIST =====
  static async getOrCreateWishlist(userId) {
    let wishlist = await Wishlist.findOne({ userId })
      .populate('items.productId', 'name price stockQty isActive sku');

    // Crear wishlist si no existe
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
      return this.formatWishlistData(wishlist);
    }

    // Filtrar productos inactivos
    const validItems = wishlist.items.filter(item => 
      item.productId && item.productId.isActive
    );

    // Actualizar wishlist si hubo cambios
    if (validItems.length !== wishlist.items.length) {
      wishlist.items = validItems;
      await wishlist.save();
    }

    return this.formatWishlistData(wishlist);
  }

  // ===== AGREGAR A WISHLIST =====
  static async addToWishlist(userId, productId) {
    // Verificar que el producto exista y esté activo
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new AppError('Producto no encontrado o no disponible', 404, 'PRODUCT_NOT_AVAILABLE');
    }

    // Obtener o crear wishlist
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
    }

    // Verificar si el producto ya está en la wishlist
    const existingItem = wishlist.items.find(
      item => item.productId.toString() === productId
    );

    if (existingItem) {
      throw new AppError('El producto ya está en tu lista de deseos', 400, 'PRODUCT_ALREADY_IN_WISHLIST');
    }

    // Agregar producto a wishlist
    wishlist.items.push({
      productId,
      addedAt: new Date()
    });

    await wishlist.save();

    // Poblar para respuesta
    await wishlist.populate('items.productId', 'name price stockQty isActive sku');

    return this.formatWishlistData(wishlist);
  }

  // ===== REMOVER DE WISHLIST =====
  static async removeFromWishlist(userId, itemId) {
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      throw new AppError('Lista de deseos no encontrada', 404, 'WISHLIST_NOT_FOUND');
    }

    const item = wishlist.items.id(itemId);
    if (!item) {
      throw new AppError('Item no encontrado en la lista de deseos', 404, 'WISHLIST_ITEM_NOT_FOUND');
    }

    item.deleteOne();
    await wishlist.save();

    // Poblar para respuesta
    await wishlist.populate('items.productId', 'name price stockQty isActive sku');

    return this.formatWishlistData(wishlist);
  }

  // ===== LIMPIAR WISHLIST =====
  static async clearWishlist(userId) {
    let wishlist = await Wishlist.findOne({ userId });
    
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
    } else {
      wishlist.items = [];
      await wishlist.save();
    }

    return this.formatWishlistData(wishlist);
  }

  // ===== MOVER A CARRITO =====
  static async moveToCart(userId, itemId) {
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      throw new AppError('Lista de deseos no encontrada', 404, 'WISHLIST_NOT_FOUND');
    }

    const item = wishlist.items.id(itemId);
    if (!item) {
      throw new AppError('Item no encontrado en la lista de deseos', 404, 'WISHLIST_ITEM_NOT_FOUND');
    }

    const productId = item.productId;

    // Verificar que el producto esté disponible
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new AppError('Producto no disponible', 404, 'PRODUCT_NOT_AVAILABLE');
    }

    if (product.stockQty < 1) {
      throw new AppError('Producto sin stock disponible', 400, 'PRODUCT_OUT_OF_STOCK');
    }

    // Obtener o crear carrito
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Verificar si el producto ya está en el carrito
    const existingCartItem = cart.items.find(
      cartItem => cartItem.productId.toString() === productId.toString()
    );

    if (existingCartItem) {
      // Verificar stock para incrementar
      if (product.stockQty < existingCartItem.quantity + 1) {
        throw new AppError(
          `Stock insuficiente. Disponible: ${product.stockQty}, en carrito: ${existingCartItem.quantity}`, 
          400, 
          'INSUFFICIENT_STOCK'
        );
      }
      
      // Incrementar cantidad en carrito
      existingCartItem.quantity += 1;
      existingCartItem.priceAtTime = product.price; // Actualizar precio
    } else {
      // Agregar nuevo item al carrito
      cart.items.push({
        productId: productId,
        quantity: 1,
        priceAtTime: product.price
      });
    }

    await cart.save();

    // Remover de wishlist
    item.deleteOne();
    await wishlist.save();

    // Poblar para respuesta
    await cart.populate('items.productId', 'name price stockQty isActive sku');
    await wishlist.populate('items.productId', 'name price stockQty isActive sku');

    return {
      cart: this.formatCartData(cart),
      wishlist: this.formatWishlistData(wishlist),
      moved: true
    };
  }

  // ===== MOVER TODOS A CARRITO =====
  static async moveAllToCart(userId) {
    const wishlist = await Wishlist.findOne({ userId })
      .populate('items.productId', 'name price stockQty isActive');

    if (!wishlist || wishlist.items.length === 0) {
      throw new AppError('Lista de deseos vacía', 400, 'WISHLIST_EMPTY');
    }

    // Obtener o crear carrito
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    const movedItems = [];
    const failedItems = [];

    for (const wishlistItem of wishlist.items) {
      const product = wishlistItem.productId;
      
      // Verificar disponibilidad
      if (!product || !product.isActive || product.stockQty < 1) {
        failedItems.push({
          productName: product?.name || 'Producto eliminado',
          reason: 'Producto no disponible o sin stock'
        });
        continue;
      }

      // Verificar si ya está en carrito
      const existingCartItem = cart.items.find(
        cartItem => cartItem.productId.toString() === product._id.toString()
      );

      if (existingCartItem) {
        // Verificar stock para incrementar
        if (product.stockQty >= existingCartItem.quantity + 1) {
          existingCartItem.quantity += 1;
          existingCartItem.priceAtTime = product.price;
          movedItems.push(product.name);
        } else {
          failedItems.push({
            productName: product.name,
            reason: `Stock insuficiente (disponible: ${product.stockQty}, en carrito: ${existingCartItem.quantity})`
          });
        }
      } else {
        // Agregar nuevo item
        cart.items.push({
          productId: product._id,
          quantity: 1,
          priceAtTime: product.price
        });
        movedItems.push(product.name);
      }
    }

    // Guardar carrito
    await cart.save();

    // Limpiar wishlist de items exitosos
    if (movedItems.length > 0) {
      const movedProductNames = movedItems;
      wishlist.items = wishlist.items.filter(item => {
        const productName = item.productId?.name;
        return !movedProductNames.includes(productName);
      });
      await wishlist.save();
    }

    // Poblar para respuesta
    await cart.populate('items.productId', 'name price stockQty isActive sku');
    await wishlist.populate('items.productId', 'name price stockQty isActive sku');

    return {
      cart: this.formatCartData(cart),
      wishlist: this.formatWishlistData(wishlist),
      summary: {
        totalAttempted: wishlist.items.length + movedItems.length,
        movedCount: movedItems.length,
        failedCount: failedItems.length,
        movedItems,
        failedItems
      }
    };
  }

  // ===== OBTENER CONTADOR DE WISHLIST =====
  static async getWishlistCount(userId) {
    const wishlist = await Wishlist.findOne({ userId });
    return wishlist ? wishlist.totalItems : 0;
  }

  // ===== VERIFICAR SI PRODUCTO ESTÁ EN WISHLIST =====
  static async isInWishlist(userId, productId) {
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) return false;

    return wishlist.items.some(item => 
      item.productId.toString() === productId.toString()
    );
  }

  // ===== OBTENER PRODUCTOS DE WISHLIST CON DISPONIBILIDAD =====
  static async getWishlistWithAvailability(userId) {
    const wishlist = await Wishlist.findOne({ userId })
      .populate('items.productId', 'name price stockQty isActive sku');

    if (!wishlist) {
      return {
        items: [],
        totalItems: 0,
        availability: {
          available: 0,
          outOfStock: 0,
          inactive: 0
        }
      };
    }

    const availability = {
      available: 0,
      outOfStock: 0,
      inactive: 0
    };

    const enhancedItems = wishlist.items.map(item => {
      const product = item.productId;
      let status = 'available';

      if (!product) {
        status = 'deleted';
      } else if (!product.isActive) {
        status = 'inactive';
        availability.inactive++;
      } else if (product.stockQty === 0) {
        status = 'out_of_stock';
        availability.outOfStock++;
      } else {
        availability.available++;
      }

      return {
        id: item._id,
        productId: product?._id,
        product: product ? {
          id: product._id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          stockQty: product.stockQty,
          isActive: product.isActive,
          inStock: product.stockQty > 0
        } : null,
        addedAt: item.addedAt,
        status,
        canAddToCart: status === 'available'
      };
    });

    return {
      id: wishlist._id,
      userId: wishlist.userId,
      items: enhancedItems,
      totalItems: wishlist.totalItems,
      availability,
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt
    };
  }

  // ===== LIMPIAR PRODUCTOS NO DISPONIBLES =====
  static async cleanUnavailableProducts(userId) {
    const wishlist = await Wishlist.findOne({ userId })
      .populate('items.productId', 'isActive');

    if (!wishlist || wishlist.items.length === 0) {
      return { message: 'Lista de deseos vacía', removedCount: 0 };
    }

    const originalCount = wishlist.items.length;
    
    // Filtrar solo productos activos
    wishlist.items = wishlist.items.filter(item => 
      item.productId && item.productId.isActive
    );

    const removedCount = originalCount - wishlist.items.length;

    if (removedCount > 0) {
      await wishlist.save();
    }

    return {
      message: `Productos no disponibles removidos: ${removedCount}`,
      removedCount,
      remainingCount: wishlist.items.length
    };
  }

  // ===== OBTENER PRODUCTOS SIMILARES =====
  static async getSimilarProducts(userId, limit = 5) {
    const wishlist = await Wishlist.findOne({ userId })
      .populate('items.productId', 'categories');

    if (!wishlist || wishlist.items.length === 0) {
      return [];
    }

    // Obtener categorías de productos en wishlist
    const categoryIds = [];
    wishlist.items.forEach(item => {
      if (item.productId && item.productId.categories) {
        categoryIds.push(...item.productId.categories);
      }
    });

    if (categoryIds.length === 0) {
      return [];
    }

    // Obtener IDs de productos ya en wishlist
    const wishlistProductIds = wishlist.items.map(item => item.productId._id);

    // Buscar productos similares
    const similarProducts = await Product.find({
      categories: { $in: categoryIds },
      _id: { $nin: wishlistProductIds },
      isActive: true,
      stockQty: { $gt: 0 }
    })
      .populate('categories', 'name slug')
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    return similarProducts.map(product => ({
      id: product._id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      stockQty: product.stockQty,
      categories: product.categories
    }));
  }

  // ===== UTILITY METHODS =====

  // Formatear datos de wishlist para respuesta
  static formatWishlistData(wishlist) {
    return {
      id: wishlist._id,
      userId: wishlist.userId,
      items: wishlist.items.map(item => ({
        id: item._id,
        productId: item.productId._id || item.productId,
        product: item.productId.name ? {
          id: item.productId._id,
          name: item.productId.name,
          sku: item.productId.sku,
          price: item.productId.price,
          stockQty: item.productId.stockQty,
          isActive: item.productId.isActive,
          inStock: item.productId.stockQty > 0
        } : null,
        addedAt: item.addedAt
      })),
      totalItems: wishlist.totalItems,
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt
    };
  }

  // Formatear datos del carrito (helper)
  static formatCartData(cart) {
    return {
      id: cart._id,
      userId: cart.userId,
      items: cart.items.map(item => ({
        id: item._id,
        productId: item.productId._id || item.productId,
        product: item.productId.name ? {
          id: item.productId._id,
          name: item.productId.name,
          sku: item.productId.sku,
          price: item.productId.price,
          stockQty: item.productId.stockQty,
          isActive: item.productId.isActive
        } : null,
        quantity: item.quantity,
        priceAtTime: item.priceAtTime,
        subtotal: item.quantity * item.priceAtTime,
        addedAt: item.addedAt
      })),
      totalItems: cart.totalItems,
      totalAmount: cart.totalAmount,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt
    };
  }

  // Verificar disponibilidad de productos en wishlist
  static async checkWishlistAvailability(userId) {
    const wishlist = await Wishlist.findOne({ userId })
      .populate('items.productId', 'stockQty isActive');

    if (!wishlist || wishlist.items.length === 0) {
      return {
        hasAvailableProducts: false,
        availableCount: 0,
        totalCount: 0
      };
    }

    const availableItems = wishlist.items.filter(item => 
      item.productId && 
      item.productId.isActive && 
      item.productId.stockQty > 0
    );

    return {
      hasAvailableProducts: availableItems.length > 0,
      availableCount: availableItems.length,
      totalCount: wishlist.items.length,
      availabilityRate: (availableItems.length / wishlist.items.length) * 100
    };
  }
}

module.exports = WishlistService; 
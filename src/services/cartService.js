const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { AppError } = require('../middlewares/errorHandler');

class CartService {
  // ===== OBTENER O CREAR CARRITO =====
  static async getOrCreateCart(userId) {
    let cart = await Cart.findOne({ userId })
      .populate('items.productId', 'name price stockQty isActive sku');

    // Crear carrito si no existe
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
      return this.formatCartData(cart);
    }

    // Filtrar productos inactivos o sin stock y actualizar precios
    const validItems = [];
    let hasChanges = false;

    for (const item of cart.items) {
      if (item.productId && item.productId.isActive && item.productId.stockQty > 0) {
        // Actualizar precio si cambió
        if (item.priceAtTime !== item.productId.price) {
          item.priceAtTime = item.productId.price;
          hasChanges = true;
        }
        validItems.push(item);
      } else {
        hasChanges = true; // Producto removido
      }
    }

    // Actualizar carrito si hubo cambios
    if (hasChanges) {
      cart.items = validItems;
      await cart.save();
    }

    return this.formatCartData(cart);
  }

  // ===== AGREGAR AL CARRITO =====
  static async addToCart(userId, itemData) {
    const { productId, quantity = 1 } = itemData;

    // Verificar que el producto exista y esté activo
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new AppError('Producto no encontrado o no disponible', 404, 'PRODUCT_NOT_AVAILABLE');
    }

    // Verificar stock disponible
    if (product.stockQty < quantity) {
      throw new AppError(`Stock insuficiente. Disponible: ${product.stockQty}`, 400, 'INSUFFICIENT_STOCK');
    }

    // Obtener o crear carrito
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Verificar si el producto ya está en el carrito
    const existingItemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Producto ya existe, actualizar cantidad
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      // Verificar stock para la nueva cantidad
      if (product.stockQty < newQuantity) {
        throw new AppError(
          `Stock insuficiente. Disponible: ${product.stockQty}, en carrito: ${cart.items[existingItemIndex].quantity}`, 
          400, 
          'INSUFFICIENT_STOCK'
        );
      }
      
      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].priceAtTime = product.price; // Actualizar precio
    } else {
      // Nuevo producto, agregar al carrito
      cart.items.push({
        productId,
        quantity,
        priceAtTime: product.price
      });
    }

    await cart.save();

    // Poblar para respuesta
    await cart.populate('items.productId', 'name price stockQty isActive sku');

    return this.formatCartData(cart);
  }

  // ===== ACTUALIZAR ITEM DEL CARRITO =====
  static async updateCartItem(userId, itemId, updateData) {
    const { quantity } = updateData;

    if (quantity < 1) {
      throw new AppError('La cantidad debe ser mayor a cero', 400, 'INVALID_QUANTITY');
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new AppError('Carrito no encontrado', 404, 'CART_NOT_FOUND');
    }

    const item = cart.items.id(itemId);
    if (!item) {
      throw new AppError('Item no encontrado en el carrito', 404, 'CART_ITEM_NOT_FOUND');
    }

    // Verificar stock del producto
    const product = await Product.findById(item.productId);
    if (!product || !product.isActive) {
      throw new AppError('Producto no disponible', 404, 'PRODUCT_NOT_AVAILABLE');
    }

    if (product.stockQty < quantity) {
      throw new AppError(`Stock insuficiente. Disponible: ${product.stockQty}`, 400, 'INSUFFICIENT_STOCK');
    }

    // Actualizar cantidad y precio
    item.quantity = quantity;
    item.priceAtTime = product.price; // Actualizar precio actual
    await cart.save();

    // Poblar para respuesta
    await cart.populate('items.productId', 'name price stockQty isActive sku');

    return this.formatCartData(cart);
  }

  // ===== REMOVER DEL CARRITO =====
  static async removeFromCart(userId, itemId) {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new AppError('Carrito no encontrado', 404, 'CART_NOT_FOUND');
    }

    const item = cart.items.id(itemId);
    if (!item) {
      throw new AppError('Item no encontrado en el carrito', 404, 'CART_ITEM_NOT_FOUND');
    }

    item.deleteOne();
    await cart.save();

    // Poblar para respuesta
    await cart.populate('items.productId', 'name price stockQty isActive sku');

    return this.formatCartData(cart);
  }

  // ===== LIMPIAR CARRITO =====
  static async clearCart(userId) {
    let cart = await Cart.findOne({ userId });
    
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    } else {
      cart.items = [];
      await cart.save();
    }

    return this.formatCartData(cart);
  }

  // ===== OBTENER RESUMEN DEL CARRITO =====
  static async getCartSummary(userId) {
    const cart = await Cart.findOne({ userId })
      .populate('items.productId', 'name price stockQty isActive');

    if (!cart || cart.items.length === 0) {
      return {
        totalItems: 0,
        totalAmount: 0,
        currency: 'MXN',
        items: [],
        isEmpty: true
      };
    }

    // Filtrar productos disponibles
    const availableItems = cart.items.filter(item => 
      item.productId && 
      item.productId.isActive && 
      item.productId.stockQty >= item.quantity
    );

    const summary = {
      totalItems: availableItems.reduce((total, item) => total + item.quantity, 0),
      totalAmount: cart.totalAmount,
      currency: 'MXN',
      itemsCount: availableItems.length,
      items: availableItems.map(item => ({
        productId: item.productId._id,
        productName: item.productId.name,
        quantity: item.quantity,
        priceAtTime: item.priceAtTime,
        currentPrice: item.productId.price,
        subtotal: item.quantity * item.priceAtTime,
        stockAvailable: item.productId.stockQty,
        hasStockIssue: item.productId.stockQty < item.quantity,
        hasPriceChange: item.priceAtTime !== item.productId.price
      })),
      isEmpty: availableItems.length === 0,
      hasIssues: cart.items.length !== availableItems.length
    };

    return summary;
  }

  // ===== OBTENER CONTADOR DEL CARRITO =====
  static async getCartCount(userId) {
    const cart = await Cart.findOne({ userId });
    return cart ? cart.totalItems : 0;
  }

  // ===== VALIDAR CARRITO =====
  static async validateCart(userId) {
    const cart = await Cart.findOne({ userId })
      .populate('items.productId', 'name price stockQty isActive');

    if (!cart || cart.items.length === 0) {
      return {
        isValid: true,
        issues: [],
        message: 'Carrito vacío'
      };
    }

    const issues = [];
    const validItems = [];

    for (const item of cart.items) {
      const issue = { 
        itemId: item._id, 
        productName: item.productId?.name || 'Producto eliminado' 
      };
      
      if (!item.productId) {
        issue.type = 'PRODUCT_DELETED';
        issue.message = 'Producto eliminado';
        issues.push(issue);
        continue;
      }

      if (!item.productId.isActive) {
        issue.type = 'PRODUCT_INACTIVE';
        issue.message = 'Producto no disponible';
        issues.push(issue);
        continue;
      }

      if (item.productId.stockQty < item.quantity) {
        issue.type = 'INSUFFICIENT_STOCK';
        issue.message = `Stock insuficiente. Disponible: ${item.productId.stockQty}, solicitado: ${item.quantity}`;
        issue.availableStock = item.productId.stockQty;
        issues.push(issue);
        continue;
      }

      if (item.priceAtTime !== item.productId.price) {
        issue.type = 'PRICE_CHANGED';
        issue.message = `Precio actualizado. Anterior: $${item.priceAtTime}, Actual: $${item.productId.price}`;
        issue.oldPrice = item.priceAtTime;
        issue.newPrice = item.productId.price;
        issues.push(issue);
      }

      validItems.push(item);
    }

    return {
      isValid: issues.length === 0,
      issues,
      validItemsCount: validItems.length,
      totalIssues: issues.length
    };
  }

  // ===== VERIFICAR DISPONIBILIDAD =====
  static async checkAvailability(userId) {
    const cart = await Cart.findOne({ userId })
      .populate('items.productId', 'name stockQty isActive');

    if (!cart || cart.items.length === 0) {
      return {
        available: true,
        message: 'Carrito vacío'
      };
    }

    const unavailableItems = [];

    for (const item of cart.items) {
      if (!item.productId || !item.productId.isActive || item.productId.stockQty < item.quantity) {
        unavailableItems.push({
          itemId: item._id,
          productName: item.productId?.name || 'Producto eliminado',
          requestedQuantity: item.quantity,
          availableStock: item.productId?.stockQty || 0,
          isActive: item.productId?.isActive || false
        });
      }
    }

    return {
      available: unavailableItems.length === 0,
      unavailableItems,
      totalUnavailable: unavailableItems.length
    };
  }

  // ===== MOVER A WISHLIST =====
  static async moveToWishlist(userId, itemId) {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new AppError('Carrito no encontrado', 404, 'CART_NOT_FOUND');
    }

    const item = cart.items.id(itemId);
    if (!item) {
      throw new AppError('Item no encontrado en el carrito', 404, 'CART_ITEM_NOT_FOUND');
    }

    const productId = item.productId;

    // Obtener o crear wishlist
    const Wishlist = require('../models/Wishlist');
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
    }

    // Verificar si el producto ya está en wishlist
    const existsInWishlist = wishlist.items.some(
      wishItem => wishItem.productId.toString() === productId.toString()
    );

    if (!existsInWishlist) {
      // Agregar a wishlist
      wishlist.items.push({
        productId: productId,
        addedAt: new Date()
      });
      await wishlist.save();
    }

    // Remover del carrito
    item.deleteOne();
    await cart.save();

    // Poblar para respuesta
    await cart.populate('items.productId', 'name price stockQty isActive sku');
    await wishlist.populate('items.productId', 'name price stockQty isActive sku');

    return {
      cart: this.formatCartData(cart),
      wishlist: this.formatWishlistData(wishlist),
      moved: true
    };
  }

  // ===== SINCRONIZAR PRECIOS =====
  static async syncCartPrices(userId) {
    const cart = await Cart.findOne({ userId })
      .populate('items.productId', 'price isActive');

    if (!cart || cart.items.length === 0) {
      return { message: 'Carrito vacío', updated: 0 };
    }

    let updatedCount = 0;

    cart.items.forEach(item => {
      if (item.productId && item.productId.isActive) {
        if (item.priceAtTime !== item.productId.price) {
          item.priceAtTime = item.productId.price;
          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      await cart.save();
    }

    return {
      message: `Precios sincronizados. ${updatedCount} items actualizados.`,
      updated: updatedCount
    };
  }

  // ===== UTILITY METHODS =====

  // Formatear datos del carrito para respuesta
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

  // Formatear datos de wishlist (helper)
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
          isActive: item.productId.isActive
        } : null,
        addedAt: item.addedAt
      })),
      totalItems: wishlist.totalItems,
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt
    };
  }

  // Verificar si un producto está en el carrito
  static async isProductInCart(userId, productId) {
    const cart = await Cart.findOne({ userId });
    if (!cart) return false;

    return cart.items.some(item => item.productId.toString() === productId.toString());
  }

  // Obtener cantidad de un producto en el carrito
  static async getProductQuantityInCart(userId, productId) {
    const cart = await Cart.findOne({ userId });
    if (!cart) return 0;

    const item = cart.items.find(item => item.productId.toString() === productId.toString());
    return item ? item.quantity : 0;
  }
}

module.exports = CartService; 
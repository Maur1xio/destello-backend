const Product = require('../models/Product');
const Category = require('../models/Category');
const { AppError } = require('../middlewares/errorHandler');
const { calculatePagination } = require('../middlewares/responseFormatter');
const { Order, Cart } = require('../models');

class ProductService {
  // ===== OBTENER TODOS LOS PRODUCTOS =====
  static async getAllProducts(filters, paginationData, userRole = null) {
    const { 
      page, 
      limit, 
      sort = '-createdAt',
      category,
      minPrice,
      maxPrice,
      inStock,
      featured,
      search,
      isActive 
    } = { ...filters, ...paginationData };

    // Construir filtros de búsqueda
    const searchFilters = {};

    // Solo mostrar productos activos por defecto (admin puede ver todos)
    if (isActive !== undefined) {
      searchFilters.isActive = isActive === 'true';
    } else if (userRole !== 'admin') {
      searchFilters.isActive = true;
    }

    // Filtrar por categoría
    if (category) {
      searchFilters.categories = category;
    }

    // Filtrar por precio
    if (minPrice || maxPrice) {
      searchFilters.price = {};
      if (minPrice) searchFilters.price.$gte = parseFloat(minPrice);
      if (maxPrice) searchFilters.price.$lte = parseFloat(maxPrice);
    }

    // Filtrar por stock
    if (inStock === 'true') {
      searchFilters.stockQty = { $gt: 0 };
    }

    // Filtrar por destacados
    if (featured === 'true') {
      searchFilters.isFeatured = true;
    }

    // Búsqueda por texto
    if (search) {
      searchFilters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Product.countDocuments(searchFilters));

    // Obtener productos
    const products = await Product.find(searchFilters)
      .populate('categories', 'name slug')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      products: products.map(product => this.formatProductData(product)),
      pagination
    };
  }

  // ===== OBTENER PRODUCTO POR ID =====
  static async getProductById(productId, userRole = null) {
    const product = await Product.findById(productId)
      .populate('categories', 'name slug');

    if (!product) {
      throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // Solo mostrar productos activos a usuarios normales
    if (!product.isActive && userRole !== 'admin') {
      throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    return this.formatProductData(product, true);
  }

  // ===== CREAR PRODUCTO (ADMIN) =====
  static async createProduct(productData) {
    const { 
      name, 
      sku, 
      description, 
      price, 
      weight, 
      dimensions, 
      stockQty, 
      categories, 
      isFeatured 
    } = productData;

    // Verificar que el SKU sea único
    await this.validateUniqueSKU(sku);

    // Verificar que las categorías existan
    if (categories && categories.length > 0) {
      await this.validateCategories(categories);
    }

    // Crear producto
    const newProduct = await Product.create({
      name,
      sku: sku.toUpperCase(),
      description,
      price,
      weight,
      dimensions,
      stockQty: stockQty || 0,
      categories: categories || [],
      isFeatured: isFeatured || false
    });

    // Poblar categorías
    await newProduct.populate('categories', 'name slug');

    return this.formatProductData(newProduct);
  }

  // ===== ACTUALIZAR PRODUCTO (ADMIN) =====
  static async updateProduct(productId, updateData) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // Verificar SKU único si se está actualizando
    if (updateData.sku && updateData.sku !== product.sku) {
      await this.validateUniqueSKU(updateData.sku, productId);
      updateData.sku = updateData.sku.toUpperCase();
    }

    // Verificar categorías si se están actualizando
    if (updateData.categories && updateData.categories.length > 0) {
      await this.validateCategories(updateData.categories);
    }

    // Actualizar producto
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true }
    ).populate('categories', 'name slug');

    return this.formatProductData(updatedProduct);
  }

  // ===== ELIMINAR PRODUCTO (ADMIN) =====
  static async deleteProduct(productId) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // ✅ VERIFICAR ÓRDENES PENDIENTES IMPLEMENTADO
    const pendingOrders = await Order.countDocuments({
      'items.productId': productId,
      status: { $in: ['pending', 'confirmed', 'processing'] }
    });
    
    if (pendingOrders > 0) {
      throw new AppError(
        `No se puede eliminar el producto. Tiene ${pendingOrders} órdenes pendientes.`, 
        400, 
        'HAS_PENDING_ORDERS'
      );
    }

    // También verificar carritos activos
    const activeCartItems = await Cart.countDocuments({
      'items.productId': productId
    });

    if (activeCartItems > 0) {
      throw new AppError(
        `No se puede eliminar el producto. Está en ${activeCartItems} carritos activos.`, 
        400, 
        'IN_ACTIVE_CARTS'
      );
    }

    await Product.findByIdAndDelete(productId);

    return { 
      message: 'Producto eliminado exitosamente',
      productId,
      productName: product.name
    };
  }

  // ===== BUSCAR PRODUCTOS =====
  static async searchProducts(searchQuery, paginationData) {
    const { q, page, limit, sort = '-createdAt' } = { ...searchQuery, ...paginationData };

    if (!q || q.trim().length < 2) {
      throw new AppError('El término de búsqueda debe tener al menos 2 caracteres', 400, 'INVALID_SEARCH_TERM');
    }

    const searchRegex = { $regex: q.trim(), $options: 'i' };
    
    const filters = {
      isActive: true,
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { sku: searchRegex }
      ]
    };

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Product.countDocuments(filters));

    // Buscar productos
    const products = await Product.find(filters)
      .populate('categories', 'name slug')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      products: products.map(product => this.formatProductData(product)),
      pagination,
      searchTerm: q
    };
  }

  // ===== OBTENER PRODUCTOS POR CATEGORÍA =====
  static async getProductsByCategory(categoryId, paginationData) {
    const { page, limit, sort = '-createdAt' } = paginationData;

    // Verificar que la categoría exista
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');
    }

    const filters = {
      categories: categoryId,
      isActive: true
    };

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Product.countDocuments(filters));

    // Obtener productos
    const products = await Product.find(filters)
      .populate('categories', 'name slug')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      category: {
        id: category._id,
        name: category.name,
        slug: category.slug
      },
      products: products.map(product => this.formatProductData(product)),
      pagination
    };
  }

  // ===== OBTENER PRODUCTOS DESTACADOS =====
  static async getFeaturedProducts(limit = 10) {
    const products = await Product.find({
      isFeatured: true,
      isActive: true
    })
      .populate('categories', 'name slug')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return products.map(product => this.formatProductData(product));
  }

  // ===== OBTENER PRODUCTOS RELACIONADOS =====
  static async getRelatedProducts(productId, limit = 5) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // Buscar productos de las mismas categorías, excluyendo el producto actual
    const relatedProducts = await Product.find({
      _id: { $ne: productId },
      categories: { $in: product.categories },
      isActive: true
    })
      .populate('categories', 'name slug')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return relatedProducts.map(product => this.formatProductData(product));
  }

  // ===== GESTIÓN DE STOCK =====

  // Actualizar stock
  static async updateStock(productId, stockData) {
    const { stockQty, operation = 'set' } = stockData;

    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    let newStock;
    switch (operation) {
      case 'add':
        newStock = product.stockQty + parseInt(stockQty);
        break;
      case 'subtract':
        newStock = Math.max(0, product.stockQty - parseInt(stockQty));
        break;
      case 'set':
      default:
        newStock = parseInt(stockQty);
        break;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { stockQty: newStock },
      { new: true }
    ).populate('categories', 'name slug');

    return {
      product: this.formatProductData(updatedProduct),
      previousStock: product.stockQty,
      newStock,
      operation
    };
  }

  // Verificar stock disponible
  static async checkStock(productId, requiredQuantity = 1) {
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new AppError('Producto no encontrado o no disponible', 404, 'PRODUCT_NOT_AVAILABLE');
    }

    return {
      productId: product._id,
      currentStock: product.stockQty,
      requiredQuantity,
      available: product.stockQty >= requiredQuantity,
      inStock: product.inStock
    };
  }

  // Reservar stock (para órdenes)
  static async reserveStock(productId, quantity) {
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new AppError('Producto no encontrado o no disponible', 404, 'PRODUCT_NOT_AVAILABLE');
    }

    if (product.stockQty < quantity) {
      throw new AppError(`Stock insuficiente. Disponible: ${product.stockQty}`, 400, 'INSUFFICIENT_STOCK');
    }

    // Actualizar stock
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $inc: { stockQty: -quantity } },
      { new: true }
    );

    return {
      productId: product._id,
      reservedQuantity: quantity,
      remainingStock: updatedProduct.stockQty
    };
  }

  // Liberar stock reservado (si se cancela orden)
  static async releaseStock(productId, quantity) {
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $inc: { stockQty: quantity } },
      { new: true }
    );

    if (!updatedProduct) {
      throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    return {
      productId: productId,
      releasedQuantity: quantity,
      newStock: updatedProduct.stockQty
    };
  }

  // ===== OBTENER ESTADO DEL STOCK (ADMIN) =====
  static async getStockStatus(productId) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    return {
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      currentStock: product.stockQty,
      inStock: product.inStock,
      stockStatus: product.stockQty === 0 ? 'out_of_stock' : 
                   product.stockQty <= 10 ? 'low_stock' : 'in_stock',
      isActive: product.isActive
    };
  }

  // ===== OBTENER PRODUCTOS POPULARES =====
  static async getPopularProducts(limit = 10) {
    // Por ahora, productos más recientes activos
    // TODO: Implementar lógica real de popularidad basada en ventas/views
    const products = await Product.find({
      isActive: true,
      stockQty: { $gt: 0 }
    })
      .populate('categories', 'name slug')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return products.map(product => this.formatProductData(product));
  }

  // ===== OBTENER ESTADÍSTICAS DEL PRODUCTO (ADMIN) =====
  static async getProductStats(productId) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // Estadísticas básicas (se expandirán cuando tengamos más modelos)
    const stats = {
      productId: product._id,
      name: product.name,
      sku: product.sku,
      createdAt: product.createdAt,
      stock: {
        current: product.stockQty,
        status: product.stockQty === 0 ? 'out_of_stock' : 
                product.stockQty <= 10 ? 'low_stock' : 'in_stock'
      },
      pricing: {
        current: product.price,
        currency: 'MXN'
      },
      categories: product.categories.length,
      isFeatured: product.isFeatured,
      isActive: product.isActive
      // TODO: Cuando tengamos otros modelos, agregar:
      // views: await ProductView.countDocuments({ productId }),
      // orders: await Order.countDocuments({ 'items.productId': productId }),
      // reviews: await Review.countDocuments({ productId }),
      // averageRating: await Review.aggregate([...])
    };

    return stats;
  }

  // ===== UTILITY METHODS =====

  // Validar SKU único
  static async validateUniqueSKU(sku, excludeProductId = null) {
    const query = { sku: sku.toUpperCase() };
    if (excludeProductId) {
      query._id = { $ne: excludeProductId };
    }

    const existingProduct = await Product.findOne(query);
    if (existingProduct) {
      throw new AppError('Ya existe un producto con este SKU', 400, 'SKU_ALREADY_EXISTS');
    }
  }

  // Validar que las categorías existan y estén activas
  static async validateCategories(categoryIds) {
    const categoryCount = await Category.countDocuments({ 
      _id: { $in: categoryIds },
      isActive: true 
    });
    
    if (categoryCount !== categoryIds.length) {
      throw new AppError('Una o más categorías no existen o están inactivas', 400, 'INVALID_CATEGORIES');
    }
  }

  // Formatear datos del producto para respuesta
  static formatProductData(product, includeDetails = false) {
    const formatted = {
      id: product._id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: product.price,
      stockQty: product.stockQty,
      inStock: product.inStock,
      isFeatured: product.isFeatured,
      isActive: product.isActive,
      categories: product.categories,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    if (includeDetails) {
      formatted.weight = product.weight;
      formatted.dimensions = product.dimensions;
    }

    return formatted;
  }

  // Verificar si un producto existe y está activo
  static async productExists(productId) {
    const product = await Product.findById(productId).select('_id isActive');
    return product && product.isActive;
  }

  // Obtener productos con stock bajo
  static async getLowStockProducts(threshold = 10) {
    const products = await Product.find({
      stockQty: { $lte: threshold, $gt: 0 },
      isActive: true
    })
      .populate('categories', 'name slug')
      .sort({ stockQty: 1 });

    return products.map(product => this.formatProductData(product));
  }

  // Obtener productos sin stock
  static async getOutOfStockProducts() {
    const products = await Product.find({
      stockQty: 0,
      isActive: true
    })
      .populate('categories', 'name slug')
      .sort({ updatedAt: -1 });

    return products.map(product => this.formatProductData(product));
  }
}

module.exports = ProductService; 
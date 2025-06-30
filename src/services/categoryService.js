const Category = require('../models/Category');
const Product = require('../models/Product');
const { AppError } = require('../middlewares/errorHandler');
const { calculatePagination } = require('../middlewares/responseFormatter');

class CategoryService {
  // ===== OBTENER TODAS LAS CATEGORÍAS =====
  static async getAllCategories(includeInactive = false) {
    const filters = {};
    if (!includeInactive) {
      filters.isActive = true;
    }

    const categories = await Category.find(filters)
      .populate('parentId', 'name slug')
      .sort({ name: 1 });

    return categories.map(category => this.formatCategoryData(category));
  }

  // ===== OBTENER CATEGORÍA POR ID =====
  static async getCategoryById(categoryId) {
    const category = await Category.findById(categoryId)
      .populate('parentId', 'name slug')
      .populate('subcategories', 'name slug isActive');

    if (!category) {
      throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');
    }

    return this.formatCategoryData(category, true);
  }

  // ===== CREAR CATEGORÍA (ADMIN) =====
  static async createCategory(categoryData) {
    const { name, description, parentId } = categoryData;

    // Verificar si ya existe una categoría con el mismo nombre y padre
    await this.validateUniqueName(name, parentId);

    // Si tiene padre, verificar que exista
    if (parentId) {
      const parentCategory = await Category.findById(parentId);
      if (!parentCategory) {
        throw new AppError('Categoría padre no encontrada', 404, 'PARENT_CATEGORY_NOT_FOUND');
      }
    }

    // Crear categoría
    const newCategory = await Category.create({
      name,
      description,
      parentId: parentId || null
    });

    // Poblar el resultado
    await newCategory.populate('parentId', 'name slug');

    return this.formatCategoryData(newCategory);
  }

  // ===== ACTUALIZAR CATEGORÍA (ADMIN) =====
  static async updateCategory(categoryId, updateData) {
    const { name, description, parentId, isActive } = updateData;

    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');
    }

    // Verificar que no se establezca como padre de sí misma
    if (parentId && parentId.toString() === categoryId) {
      throw new AppError('Una categoría no puede ser padre de sí misma', 400, 'CANNOT_BE_SELF_PARENT');
    }

    // Verificar que no se cree un ciclo en la jerarquía
    if (parentId) {
      const wouldCreateCycle = await this.wouldCreateCycle(categoryId, parentId);
      if (wouldCreateCycle) {
        throw new AppError('No se puede establecer esta relación padre-hijo ya que crearía un ciclo', 400, 'CIRCULAR_REFERENCE');
      }
    }

    // Verificar nombre único en el mismo nivel
    if (name && name !== category.name) {
      await this.validateUniqueName(name, parentId !== undefined ? parentId : category.parentId, categoryId);
    }

    // Actualizar categoría
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { name, description, parentId, isActive },
      { new: true, runValidators: true }
    ).populate('parentId', 'name slug');

    return this.formatCategoryData(updatedCategory);
  }

  // ===== ELIMINAR CATEGORÍA (ADMIN) =====
  static async deleteCategory(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');
    }

    // Verificar si tiene subcategorías
    const subcategoriesCount = await Category.countDocuments({ parentId: categoryId });
    if (subcategoriesCount > 0) {
      throw new AppError('No se puede eliminar una categoría que tiene subcategorías', 400, 'HAS_SUBCATEGORIES');
    }

    // Verificar si tiene productos
    const productsCount = await Product.countDocuments({ categories: categoryId });
    if (productsCount > 0) {
      throw new AppError('No se puede eliminar una categoría que tiene productos asociados', 400, 'HAS_PRODUCTS');
    }

    await Category.findByIdAndDelete(categoryId);

    return { message: 'Categoría eliminada exitosamente' };
  }

  // ===== OBTENER ÁRBOL DE CATEGORÍAS =====
  static async getCategoryTree(includeInactive = false) {
    const filters = {};
    if (!includeInactive) {
      filters.isActive = true;
    }

    // Obtener todas las categorías
    const categories = await Category.find(filters).sort({ name: 1 });

    // Construir árbol jerárquico
    const buildTree = (parentId = null) => {
      return categories
        .filter(cat => (cat.parentId?.toString() || null) === parentId)
        .map(cat => ({
          ...this.formatCategoryData(cat),
          children: buildTree(cat._id.toString())
        }));
    };

    return buildTree();
  }

  // ===== OBTENER RUTA DE CATEGORÍA =====
  static async getCategoryPath(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');
    }

    const path = await category.getFullPath();

    return {
      categoryId,
      path: path.map(cat => this.formatCategoryData(cat)),
      breadcrumb: path.map(cat => ({
        id: cat._id,
        name: cat.name,
        slug: cat.slug
      }))
    };
  }

  // ===== OBTENER SUBCATEGORÍAS =====
  static async getSubcategories(categoryId, includeInactive = false) {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');
    }

    const filters = { parentId: categoryId };
    if (!includeInactive) {
      filters.isActive = true;
    }

    const subcategories = await Category.find(filters).sort({ name: 1 });

    return subcategories.map(cat => this.formatCategoryData(cat));
  }

  // ===== OBTENER PRODUCTOS DE CATEGORÍA =====
  static async getCategoryProducts(categoryId, queryParams) {
    const { 
      page = 1, 
      limit = 20, 
      sort = '-createdAt',
      minPrice,
      maxPrice,
      inStock,
      featured
    } = queryParams;

    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');
    }

    // Obtener todas las categorías descendientes
    const categoryIds = await this.getAllDescendantIds(categoryId);

    // Construir filtros para productos
    const filters = { 
      categories: { $in: categoryIds },
      isActive: true
    };

    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = parseFloat(minPrice);
      if (maxPrice) filters.price.$lte = parseFloat(maxPrice);
    }

    if (inStock === 'true') {
      filters.stockQty = { $gt: 0 };
    }

    if (featured === 'true') {
      filters.isFeatured = true;
    }

    // Calcular paginación
    const pagination = calculatePagination(page, limit, await Product.countDocuments(filters));

    // Obtener productos
    const products = await Product.find(filters)
      .populate('categories', 'name slug')
      .sort(sort)
      .skip(pagination.offset)
      .limit(pagination.limit);

    return {
      category: this.formatCategoryData(category),
      products,
      pagination
    };
  }

  // ===== REORDENAR CATEGORÍAS (ADMIN) =====
  static async reorderCategories(categoryOrders) {
    if (!Array.isArray(categoryOrders)) {
      throw new AppError('Se esperaba un array de órdenes de categorías', 400, 'INVALID_ORDER_DATA');
    }

    // Validar que todas las categorías existan
    const categoryIds = categoryOrders.map(item => item.id);
    const existingCount = await Category.countDocuments({ _id: { $in: categoryIds } });
    
    if (existingCount !== categoryIds.length) {
      throw new AppError('Una o más categorías no existen', 400, 'INVALID_CATEGORY_IDS');
    }

    // Actualizar el orden de cada categoría
    const updatePromises = categoryOrders.map(({ id, order }) => 
      Category.findByIdAndUpdate(id, { order: parseInt(order) })
    );

    await Promise.all(updatePromises);

    return { message: 'Orden de categorías actualizado exitosamente' };
  }

  // ===== BUSCAR CATEGORÍAS =====
  static async searchCategories(searchTerm, includeInactive = false) {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new AppError('El término de búsqueda debe tener al menos 2 caracteres', 400, 'INVALID_SEARCH_TERM');
    }

    const searchRegex = { $regex: searchTerm.trim(), $options: 'i' };
    
    const filters = {
      $or: [
        { name: searchRegex },
        { description: searchRegex }
      ]
    };

    if (!includeInactive) {
      filters.isActive = true;
    }

    const categories = await Category.find(filters)
      .populate('parentId', 'name slug')
      .sort({ name: 1 })
      .limit(50); // Limitar resultados de búsqueda

    return categories.map(cat => this.formatCategoryData(cat));
  }

  // ===== UTILITY METHODS =====

  // Validar nombre único en el mismo nivel
  static async validateUniqueName(name, parentId, excludeCategoryId = null) {
    const query = {
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      parentId: parentId || null
    };

    if (excludeCategoryId) {
      query._id = { $ne: excludeCategoryId };
    }

    const existingCategory = await Category.findOne(query);
    if (existingCategory) {
      throw new AppError('Ya existe una categoría con este nombre en el mismo nivel', 400, 'CATEGORY_NAME_EXISTS');
    }
  }

  // Verificar si crear relación padre-hijo causaría un ciclo
  static async wouldCreateCycle(categoryId, parentId) {
    // Obtener todos los descendientes de la categoría
    const descendants = await this.getAllDescendantIds(categoryId);
    
    // Si el parentId propuesto está en los descendientes, crearía un ciclo
    return descendants.includes(parentId.toString());
  }

  // Obtener todos los IDs de categorías descendientes
  static async getAllDescendantIds(categoryId) {
    const descendants = [categoryId.toString()];
    
    const getChildren = async (parentId) => {
      const children = await Category.find({ parentId }).select('_id');
      
      for (const child of children) {
        descendants.push(child._id.toString());
        await getChildren(child._id);
      }
    };
    
    await getChildren(categoryId);
    return descendants;
  }

  // Formatear datos de categoría para respuesta
  static formatCategoryData(category, includeSubcategories = false) {
    const formatted = {
      id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      isActive: category.isActive,
      order: category.order,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };

    if (includeSubcategories && category.subcategories) {
      formatted.subcategories = category.subcategories;
    }

    return formatted;
  }

  // Verificar si una categoría existe y está activa
  static async categoryExists(categoryId) {
    const category = await Category.findById(categoryId).select('_id isActive');
    return category && category.isActive;
  }

  // Obtener estadísticas de categoría
  static async getCategoryStats(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');
    }

    const descendantIds = await this.getAllDescendantIds(categoryId);
    const subcategoriesCount = await Category.countDocuments({ parentId: categoryId });
    const productsCount = await Product.countDocuments({ 
      categories: { $in: descendantIds },
      isActive: true 
    });

    return {
      categoryId: category._id,
      name: category.name,
      subcategoriesCount,
      totalProductsCount: productsCount,
      isActive: category.isActive,
      createdAt: category.createdAt,
      level: await this.getCategoryLevel(categoryId)
    };
  }

  // Obtener nivel de profundidad de la categoría
  static async getCategoryLevel(categoryId) {
    let level = 0;
    let currentId = categoryId;

    while (currentId) {
      const category = await Category.findById(currentId).select('parentId');
      if (!category || !category.parentId) break;
      
      level++;
      currentId = category.parentId;
    }

    return level;
  }
}

module.exports = CategoryService; 
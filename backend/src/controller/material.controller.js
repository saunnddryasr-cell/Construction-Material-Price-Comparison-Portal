const Material = require('../models/Material.model');
const Price = require('../models/Price.model');
const { logger } = require('../config/logger');
const { ApiResponse } = require('../utils/apiResponse');
const { ValidationError, NotFoundError } = require('../utils/errorCodes');

class MaterialController {
  // Create material
  async createMaterial(req, res, next) {
    try {
      const materialData = req.body;
      
      // Check if material exists
      const existing = await Material.findOne({ name: materialData.name });
      if (existing) {
        throw new ValidationError('Material already exists');
      }

      const material = new Material({
        ...materialData,
        createdBy: req.user._id,
      });

      await material.save();

      logger.info(`Material created: ${material.name}`);
      
      return ApiResponse.success(res, {
        material,
        message: 'Material created successfully',
      }, 201);
    } catch (error) {
      next(error);
    }
  }

  // Get all materials
  async getMaterials(req, res, next) {
    try {
      const { page = 1, limit = 20, search, category, brand, isActive = true } = req.query;
      
      const query = { isActive: isActive === 'true' };
      
      if (category) {
        query.category = category;
      }
      if (brand) {
        query['specifications.brand'] = brand;
      }

      let materials;
      let total;

      if (search) {
        materials = await Material.searchMaterials(search, query);
        total = materials.length;
      } else {
        const skip = (parseInt(page) - 1) * parseInt(limit);
        materials = await Material.find(query)
          .skip(skip)
          .limit(parseInt(limit))
          .sort({ name: 1 });
        total = await Material.countDocuments(query);
      }

      // Get latest prices for materials
      const materialsWithPrices = await Promise.all(
        materials.map(async (material) => {
          const latestPrice = await Price.findOne({
            materialId: material._id,
            isActive: true,
            stockQuantity: { $gt: 0 },
          })
          .sort({ lastUpdated: -1 })
          .select('price unit supplierId');
          
          return {
            ...material,
            latestPrice: latestPrice || null,
          };
        })
      );

      return ApiResponse.success(res, {
        materials: materialsWithPrices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get material by ID
  async getMaterialById(req, res, next) {
    try {
      const { id } = req.params;
      
      const material = await Material.findById(id);
      if (!material) {
        throw new NotFoundError('Material not found');
      }

      // Get all prices for this material
      const prices = await Price.find({
        materialId: material._id,
        isActive: true,
        stockQuantity: { $gt: 0 },
      })
      .populate('supplierId', 'profile.companyName profile.rating profile.verified')
      .sort({ price: 1 });

      return ApiResponse.success(res, {
        material,
        prices,
        supplierCount: prices.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update material
  async updateMaterial(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const material = await Material.findById(id);
      if (!material) {
        throw new NotFoundError('Material not found');
      }

      Object.assign(material, updates);
      await material.save();

      logger.info(`Material updated: ${material.name}`);

      return ApiResponse.success(res, {
        material,
        message: 'Material updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete material
  async deleteMaterial(req, res, next) {
    try {
      const { id } = req.params;
      
      const material = await Material.findById(id);
      if (!material) {
        throw new NotFoundError('Material not found');
      }

      material.isActive = false;
      await material.save();

      // Deactivate all prices for this material
      await Price.updateMany(
        { materialId: id },
        { isActive: false }
      );

      logger.info(`Material deleted: ${material.name}`);

      return ApiResponse.success(res, {
        message: 'Material deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Get material categories
  async getCategories(req, res, next) {
    try {
      const categories = await Material.getDistinctCategories();
      
      const categoryData = await Promise.all(
        categories.map(async (category) => {
          const count = await Material.countDocuments({ category, isActive: true });
          return {
            name: category,
            count,
          };
        })
      );

      return ApiResponse.success(res, {
        categories: categoryData,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get material brands
  async getBrands(req, res, next) {
    try {
      const { category } = req.query;
      
      const brands = await Material.getDistinctBrands(category);
      
      const brandData = await Promise.all(
        brands.map(async (brand) => {
          const query = { 'specifications.brand': brand, isActive: true };
          if (category) {
            query.category = category;
          }
          const count = await Material.countDocuments(query);
          return {
            name: brand,
            count,
          };
        })
      );

      return ApiResponse.success(res, {
        brands: brandData,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MaterialController();
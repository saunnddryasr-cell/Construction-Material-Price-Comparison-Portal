const Material = require('../models/Material.model');
const Price = require('../models/Price.model');
const User = require('../models/User.model');
const { logger } = require('../config/logger');
const { ApiResponse } = require('../../utils/apiResponse');
const { ValidationError } = require('../../utils/errorCodes');
const cacheService = require('../services/cache.service');

class SearchController {
  // Comprehensive search for materials, suppliers, and prices
  async search(req, res, next) {
    try {
      const {
        q,
        type = 'all',
        category,
        city,
        state,
        minPrice,
        maxPrice,
        brand,
        rating,
        sortBy = 'relevance',
        page = 1,
        limit = 20,
      } = req.query;

      if (!q || q.trim().length < 2) {
        throw new ValidationError('Search query must be at least 2 characters');
      }

      const searchQuery = q.trim();
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const limitNum = parseInt(limit);

      // Check cache
      const cacheKey = `search:${searchQuery}:${type}:${category}:${city}:${state}:${page}:${limit}`;
      const cachedResult = await cacheService.get(cacheKey);
      
      if (cachedResult) {
        return ApiResponse.success(res, {
          ...cachedResult,
          fromCache: true,
        });
      }

      let results = {};
      let total = 0;

      // Search based on type
      switch (type) {
        case 'materials':
          results = await this.searchMaterials(searchQuery, {
            category,
            brand,
            minPrice,
            maxPrice,
            city,
            state,
            sortBy,
            skip,
            limit: limitNum,
          });
          total = results.total || 0;
          break;

        case 'suppliers':
          results = await this.searchSuppliers(searchQuery, {
            city,
            state,
            rating,
            category,
            sortBy,
            skip,
            limit: limitNum,
          });
          total = results.total || 0;
          break;

        case 'prices':
          results = await this.searchPrices(searchQuery, {
            category,
            city,
            state,
            minPrice,
            maxPrice,
            sortBy,
            skip,
            limit: limitNum,
          });
          total = results.total || 0;
          break;

        case 'all':
        default:
          results = await this.searchAll(searchQuery, {
            category,
            city,
            state,
            minPrice,
            maxPrice,
            brand,
            rating,
            sortBy,
            skip,
            limit: limitNum,
          });
          total = results.total || 0;
          break;
      }

      const response = {
        query: searchQuery,
        type,
        results,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
        timestamp: new Date(),
        fromCache: false,
      };

      // Cache results (5 minutes)
      await cacheService.set(cacheKey, response, 300);

      return ApiResponse.success(res, response);
    } catch (error) {
      next(error);
    }
  }

  // Search materials
  async searchMaterials(query, filters) {
    const {
      category,
      brand,
      minPrice,
      maxPrice,
      city,
      state,
      sortBy = 'relevance',
      skip = 0,
      limit = 20,
    } = filters;

    const match = { isActive: true };

    // Text search
    const textSearch = { $text: { $search: query } };
    
    // Category filter
    if (category) {
      match.category = category;
    }

    // Brand filter
    if (brand) {
      match['specifications.brand'] = brand;
    }

    // Build the search pipeline
    const pipeline = [
      {
        $match: {
          ...textSearch,
          ...match,
        },
      },
    ];

    // Add sorting
    if (sortBy === 'relevance') {
      pipeline.push({
        $sort: { score: { $meta: 'textScore' } },
      });
    } else if (sortBy === 'price_asc') {
      pipeline.push({ $sort: { 'priceInfo.avgPrice': 1 } });
    } else if (sortBy === 'price_desc') {
      pipeline.push({ $sort: { 'priceInfo.avgPrice': -1 } });
    } else if (sortBy === 'name') {
      pipeline.push({ $sort: { name: 1 } });
    }

    // Lookup prices for each material
    pipeline.push(
      {
        $lookup: {
          from: 'prices',
          let: { materialId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$materialId', '$$materialId'] },
                isActive: true,
                stockQuantity: { $gt: 0 },
                ...(city ? { 'location.city': city } : {}),
                ...(state ? { 'location.state': state } : {}),
                ...(minPrice ? { price: { $gte: parseFloat(minPrice) } } : {}),
                ...(maxPrice ? { price: { $lte: parseFloat(maxPrice) } } : {}),
              },
            },
            {
              $group: {
                _id: null,
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' },
                supplierCount: { $sum: 1 },
                prices: { $push: '$$ROOT' },
              },
            },
            {
              $project: {
                _id: 0,
                avgPrice: { $round: ['$avgPrice', 2] },
                minPrice: { $round: ['$minPrice', 2] },
                maxPrice: { $round: ['$maxPrice', 2] },
                supplierCount: 1,
                lowestPrice: { $arrayElemAt: ['$prices', 0] },
              },
            },
          ],
          as: 'priceInfo',
        },
      },
      {
        $unwind: {
          path: '$priceInfo',
          preserveNullAndEmptyArrays: true,
        },
      }
    );

    // Count total
    const countPipeline = [...pipeline];
    const countResult = await Material.aggregate([
      ...countPipeline,
      { $count: 'total' },
    ]);

    // Apply pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const results = await Material.aggregate(pipeline);

    // Enrich with supplier details for lowest price
    const enrichedResults = await Promise.all(
      results.map(async (material) => {
        if (material.priceInfo && material.priceInfo.lowestPrice) {
          const supplier = await User.findById(
            material.priceInfo.lowestPrice.supplierId
          ).select('profile.companyName profile.rating profile.verified');
          
          return {
            ...material,
            priceInfo: {
              ...material.priceInfo,
              lowestPrice: {
                ...material.priceInfo.lowestPrice,
                supplier,
              },
            },
          };
        }
        return material;
      })
    );

    return {
      materials: enrichedResults,
      total: countResult.length > 0 ? countResult[0].total : 0,
    };
  }

  // Search suppliers
  async searchSuppliers(query, filters) {
    const {
      city,
      state,
      rating,
      category,
      sortBy = 'relevance',
      skip = 0,
      limit = 20,
    } = filters;

    const match = {
      role: 'supplier',
      isActive: true,
    };

    // Text search on company name and description
    if (query) {
      match.$or = [
        { 'profile.companyName': { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
        { 'profile.description': { $regex: query, $options: 'i' } },
      ];
    }

    // Location filters
    if (city) {
      match['profile.address.city'] = { $regex: city, $options: 'i' };
    }
    if (state) {
      match['profile.address.state'] = { $regex: state, $options: 'i' };
    }

    // Rating filter
    if (rating) {
      match['profile.rating'] = { $gte: parseFloat(rating) };
    }

    // Build pipeline
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'prices',
          let: { supplierId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$supplierId', '$$supplierId'] },
                isActive: true,
                stockQuantity: { $gt: 0 },
                ...(category ? { 'materialId': { $in: await this.getMaterialIdsByCategory(category) } } : {}),
              },
            },
            {
              $group: {
                _id: null,
                materialCount: { $sum: 1 },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' },
              },
            },
          ],
          as: 'priceStats',
        },
      },
      {
        $unwind: {
          path: '$priceStats',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'reviews',
          let: { supplierId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$supplierId', '$$supplierId'] },
              },
            },
            {
              $group: {
                _id: null,
                avgRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 },
              },
            },
          ],
          as: 'reviewStats',
        },
      },
      {
        $unwind: {
          path: '$reviewStats',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // Sorting
    if (sortBy === 'relevance') {
      pipeline.push({ $sort: { 'profile.rating': -1 } });
    } else if (sortBy === 'rating') {
      pipeline.push({ $sort: { 'profile.rating': -1 } });
    } else if (sortBy === 'price_asc') {
      pipeline.push({ $sort: { 'priceStats.minPrice': 1 } });
    } else if (sortBy === 'material_count') {
      pipeline.push({ $sort: { 'priceStats.materialCount': -1 } });
    } else {
      pipeline.push({ $sort: { 'profile.companyName': 1 } });
    }

    // Count total
    const countPipeline = [...pipeline];
    const countResult = await User.aggregate([
      ...countPipeline,
      { $count: 'total' },
    ]);

    // Apply pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const results = await User.aggregate(pipeline);

    // Format results
    const formattedResults = results.map(supplier => ({
      _id: supplier._id,
      username: supplier.username,
      email: supplier.email,
      profile: {
        ...supplier.profile,
        rating: supplier.reviewStats?.avgRating || supplier.profile.rating || 0,
        reviewCount: supplier.reviewStats?.reviewCount || 0,
      },
      materialCount: supplier.priceStats?.materialCount || 0,
      priceRange: supplier.priceStats ? {
        min: supplier.priceStats.minPrice,
        max: supplier.priceStats.maxPrice,
        avg: supplier.priceStats.avgPrice,
      } : null,
    }));

    return {
      suppliers: formattedResults,
      total: countResult.length > 0 ? countResult[0].total : 0,
    };
  }

  // Search prices directly
  async searchPrices(query, filters) {
    const {
      category,
      city,
      state,
      minPrice,
      maxPrice,
      sortBy = 'price_asc',
      skip = 0,
      limit = 20,
    } = filters;

    // First find matching materials
    const materialMatch = { isActive: true };
    if (category) {
      materialMatch.category = category;
    }
    if (query) {
      materialMatch.$text = { $search: query };
    }

    const materials = await Material.find(materialMatch)
      .select('_id name category unit')
      .lean();

    if (materials.length === 0) {
      return { prices: [], total: 0 };
    }

    const materialIds = materials.map(m => m._id);

    // Build price query
    const priceMatch = {
      materialId: { $in: materialIds },
      isActive: true,
      stockQuantity: { $gt: 0 },
    };

    if (city) {
      priceMatch['location.city'] = city;
    }
    if (state) {
      priceMatch['location.state'] = state;
    }
    if (minPrice) {
      priceMatch.price = { $gte: parseFloat(minPrice) };
    }
    if (maxPrice) {
      priceMatch.price = { ...priceMatch.price, $lte: parseFloat(maxPrice) };
    }

    // Build pipeline
    const pipeline = [
      { $match: priceMatch },
      {
        $lookup: {
          from: 'materials',
          localField: 'materialId',
          foreignField: '_id',
          as: 'material',
        },
      },
      { $unwind: '$material' },
      {
        $lookup: {
          from: 'users',
          localField: 'supplierId',
          foreignField: '_id',
          as: 'supplier',
        },
      },
      { $unwind: '$supplier' },
      {
        $match: {
          'supplier.isActive': true,
          'supplier.role': 'supplier',
        },
      },
      {
        $project: {
          _id: 1,
          price: 1,
          unit: 1,
          stockQuantity: 1,
          minimumOrderQuantity: 1,
          lastUpdated: 1,
          location: 1,
          deliveryOptions: 1,
          'material.name': 1,
          'material.category': 1,
          'material.unit': 1,
          'supplier._id': 1,
          'supplier.profile.companyName': 1,
          'supplier.profile.rating': 1,
          'supplier.profile.verified': 1,
          'supplier.profile.phone': 1,
        },
      },
    ];

    // Sorting
    if (sortBy === 'price_asc') {
      pipeline.push({ $sort: { price: 1 } });
    } else if (sortBy === 'price_desc') {
      pipeline.push({ $sort: { price: -1 } });
    } else if (sortBy === 'rating') {
      pipeline.push({ $sort: { 'supplier.profile.rating': -1 } });
    } else if (sortBy === 'recent') {
      pipeline.push({ $sort: { lastUpdated: -1 } });
    }

    // Count total
    const countPipeline = [...pipeline];
    const countResult = await Price.aggregate([
      ...countPipeline,
      { $count: 'total' },
    ]);

    // Apply pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const results = await Price.aggregate(pipeline);

    return {
      prices: results,
      total: countResult.length > 0 ? countResult[0].total : 0,
    };
  }

  // Search all (materials, suppliers, prices)
  async searchAll(query, filters) {
    const {
      category,
      city,
      state,
      minPrice,
      maxPrice,
      brand,
      rating,
      sortBy = 'relevance',
      skip = 0,
      limit = 20,
    } = filters;

    // Get materials
    const materialResults = await this.searchMaterials(query, {
      category,
      brand,
      minPrice,
      maxPrice,
      city,
      state,
      sortBy,
      skip: 0,
      limit: 10,
    });

    // Get suppliers
    const supplierResults = await this.searchSuppliers(query, {
      city,
      state,
      rating,
      category,
      sortBy,
      skip: 0,
      limit: 10,
    });

    // Get prices
    const priceResults = await this.searchPrices(query, {
      category,
      city,
      state,
      minPrice,
      maxPrice,
      sortBy,
      skip: 0,
      limit: 10,
    });

    // Combine and sort by relevance
    const combined = [
      ...(materialResults.materials || []).map(item => ({
        ...item,
        _type: 'material',
        relevanceScore: this.calculateRelevance(query, item.name),
      })),
      ...(supplierResults.suppliers || []).map(item => ({
        ...item,
        _type: 'supplier',
        relevanceScore: this.calculateRelevance(query, item.profile.companyName),
      })),
      ...(priceResults.prices || []).map(item => ({
        ...item,
        _type: 'price',
        relevanceScore: this.calculateRelevance(query, item.material.name),
      })),
    ];

    // Sort by relevance
    combined.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply pagination
    const paginated = combined.slice(skip, skip + limit);

    return {
      items: paginated,
      total: combined.length,
      counts: {
        materials: materialResults.materials?.length || 0,
        suppliers: supplierResults.suppliers?.length || 0,
        prices: priceResults.prices?.length || 0,
      },
    };
  }

  // Helper: Get material IDs by category
  async getMaterialIdsByCategory(category) {
    const materials = await Material.find({ category, isActive: true })
      .select('_id')
      .lean();
    return materials.map(m => m._id);
  }

  // Helper: Calculate relevance score
  calculateRelevance(query, text) {
    if (!text) return 0;
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    // Exact match
    if (textLower === queryLower) return 100;
    
    // Contains exact phrase
    if (textLower.includes(queryLower)) return 80;
    
    // Word match
    const queryWords = queryLower.split(' ');
    const textWords = textLower.split(' ');
    let matches = 0;
    queryWords.forEach(word => {
      if (textWords.some(tw => tw.includes(word))) {
        matches++;
      }
    });
    
    return Math.min(70, (matches / queryWords.length) * 70);
  }

  // Autocomplete / Typeahead
  async autocomplete(req, res, next) {
    try {
      const { q, limit = 10 } = req.query;

      if (!q || q.trim().length < 1) {
        return ApiResponse.success(res, { suggestions: [] });
      }

      const query = q.trim();

      // Get material suggestions
      const materials = await Material.find({
        name: { $regex: query, $options: 'i' },
        isActive: true,
      })
        .select('name category')
        .limit(parseInt(limit));

      // Get supplier suggestions
      const suppliers = await User.find({
        role: 'supplier',
        isActive: true,
        'profile.companyName': { $regex: query, $options: 'i' },
      })
        .select('profile.companyName')
        .limit(parseInt(limit));

      // Combine suggestions
      const suggestions = [
        ...materials.map(m => ({
          type: 'material',
          label: m.name,
          value: m.name,
          category: m.category,
        })),
        ...suppliers.map(s => ({
          type: 'supplier',
          label: s.profile.companyName,
          value: s.profile.companyName,
        })),
      ];

      // Remove duplicates and sort
      const unique = [];
      const seen = new Set();
      for (const item of suggestions) {
        const key = `${item.type}:${item.label}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }

      // Limit results
      const limited = unique.slice(0, parseInt(limit));

      return ApiResponse.success(res, {
        suggestions: limited,
        query,
        total: limited.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Advanced filters
  async getFilterOptions(req, res, next) {
    try {
      const { category } = req.query;

      // Get all unique filter options
      const [
        categories,
        brands,
        cities,
        states,
      ] = await Promise.all([
        Material.distinct('category', { isActive: true }),
        Material.distinct('specifications.brand', { isActive: true }),
        Price.distinct('location.city', { isActive: true }),
        Price.distinct('location.state', { isActive: true }),
      ]);

      // Get price range
      const priceRange = await Price.aggregate([
        { $match: { isActive: true, stockQuantity: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            min: { $min: '$price' },
            max: { $max: '$price' },
          },
        },
      ]);

      const filters = {
        categories: categories.filter(c => c).map(c => ({ value: c, label: c })),
        brands: brands.filter(b => b).map(b => ({ value: b, label: b })),
        cities: cities.filter(c => c).map(c => ({ value: c, label: c })),
        states: states.filter(s => s).map(s => ({ value: s, label: s })),
        priceRange: priceRange.length > 0 ? {
          min: Math.floor(priceRange[0].min),
          max: Math.ceil(priceRange[0].max),
        } : { min: 0, max: 1000 },
        ratingOptions: [
          { value: 1, label: '1 Star & Up' },
          { value: 2, label: '2 Stars & Up' },
          { value: 3, label: '3 Stars & Up' },
          { value: 4, label: '4 Stars & Up' },
          { value: 5, label: '5 Stars Only' },
        ],
        sortOptions: [
          { value: 'relevance', label: 'Relevance' },
          { value: 'price_asc', label: 'Price: Low to High' },
          { value: 'price_desc', label: 'Price: High to Low' },
          { value: 'rating', label: 'Highest Rated' },
          { value: 'recent', label: 'Most Recent' },
          { value: 'name', label: 'Name A-Z' },
        ],
      };

      return ApiResponse.success(res, {
        filters,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }

  // Save search history for user
  async saveSearch(req, res, next) {
    try {
      const { query, filters } = req.body;
      const userId = req.user._id;

      if (!query || query.trim().length < 2) {
        throw new ValidationError('Search query is required');
      }

      const user = await User.findById(userId);
      
      // Add to recent searches (max 20)
      const searchEntry = query.trim();
      user.preferences.recentSearches = [
        searchEntry,
        ...user.preferences.recentSearches.filter(s => s !== searchEntry),
      ].slice(0, 20);

      await user.save();

      logger.info(`Search saved for user ${userId}: ${query}`);

      return ApiResponse.success(res, {
        message: 'Search saved successfully',
        recentSearches: user.preferences.recentSearches,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get search history
  async getSearchHistory(req, res, next) {
    try {
      const user = await User.findById(req.user._id);
      
      return ApiResponse.success(res, {
        recentSearches: user.preferences.recentSearches || [],
      });
    } catch (error) {
      next(error);
    }
  }

  // Clear search history
  async clearSearchHistory(req, res, next) {
    try {
      const user = await User.findById(req.user._id);
      user.preferences.recentSearches = [];
      await user.save();

      return ApiResponse.success(res, {
        message: 'Search history cleared successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Get trending searches
  async getTrendingSearches(req, res, next) {
    try {
      // Get trending searches from analytics or cache
      // This could be implemented with a separate analytics collection
      // For now, return some default trending searches
      
      const trending = [
        { query: 'cement', count: 150 },
        { query: 'steel', count: 120 },
        { query: 'bricks', count: 95 },
        { query: 'sand', count: 80 },
        { query: 'aggregates', count: 65 },
        { query: 'tmt bars', count: 55 },
        { query: 'opc cement', count: 50 },
        { query: 'river sand', count: 45 },
        { query: 'red bricks', count: 40 },
        { query: 'm sand', count: 35 },
      ];

      return ApiResponse.success(res, {
        trending,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SearchController();
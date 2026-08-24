const Material = require('../src/models/Material.model');
const User = require('../src/models/User.model');
const Price = require('../src/models/Price.model');
const Supplier = require('../src/models/Supplier.model');
const cacheService = require('./cache.service');
const { logger } = require('../src/config/logger');

class SearchService {
  /**
   * Comprehensive search
   */
  async search(query, filters = {}, pagination = {}) {
    const { type = 'all', category, city, state, minPrice, maxPrice, brand, rating } = filters;
    const { page = 1, limit = 20 } = pagination;

    const results = {
      query,
      type,
      results: {},
      total: 0,
    };

    // Search based on type
    switch (type) {
      case 'materials':
        results.results = await this.searchMaterials(query, filters, pagination);
        break;
      case 'suppliers':
        results.results = await this.searchSuppliers(query, filters, pagination);
        break;
      case 'prices':
        results.results = await this.searchPrices(query, filters, pagination);
        break;
      case 'all':
      default:
        const [materials, suppliers, prices] = await Promise.all([
          this.searchMaterials(query, filters, { page: 1, limit: 10 }),
          this.searchSuppliers(query, filters, { page: 1, limit: 10 }),
          this.searchPrices(query, filters, { page: 1, limit: 10 }),
        ]);
        results.results = {
          materials: materials.results,
          suppliers: suppliers.results,
          prices: prices.results,
          counts: {
            materials: materials.total || 0,
            suppliers: suppliers.total || 0,
            prices: prices.total || 0,
          },
        };
        break;
    }

    return results;
  }

  /**
   * Search materials
   */
  async searchMaterials(query, filters = {}, pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const { category, brand, city, state, minPrice, maxPrice } = filters;

    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = { isActive: true };
    
    if (query) {
      searchQuery.$text = { $search: query };
    }

    if (category) {
      searchQuery.category = category;
    }

    if (brand) {
      searchQuery['specifications.brand'] = brand;
    }

    // Get materials
    const materials = await Material.find(searchQuery)
      .skip(skip)
      .limit(limit)
      .sort(query ? { score: { $meta: 'textScore' } } : { name: 1 });

    const total = await Material.countDocuments(searchQuery);

    // Enrich with price info
    const enriched = await Promise.all(
      materials.map(async (material) => {
        const priceInfo = await this.getMaterialPriceInfo(material._id, { city, state, minPrice, maxPrice });
        return {
          ...material.toObject(),
          priceInfo,
        };
      })
    );

    return {
      results: enriched,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Search suppliers
   */
  async searchSuppliers(query, filters = {}, pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const { category, city, state, rating, verified } = filters;

    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = {
      status: 'active',
      'verification.status': 'verified',
    };

    if (query) {
      searchQuery.$or = [
        { 'business.name': { $regex: query, $options: 'i' } },
        { 'contact.email': { $regex: query, $options: 'i' } },
      ];
    }

    if (category) {
      searchQuery['categories.category'] = category;
    }

    if (city) {
      searchQuery['address.registered.city'] = { $regex: city, $options: 'i' };
    }

    if (state) {
      searchQuery['address.registered.state'] = { $regex: state, $options: 'i' };
    }

    if (rating) {
      searchQuery['ratings.average'] = { $gte: rating };
    }

    if (verified !== undefined) {
      searchQuery['verification.status'] = verified ? 'verified' : { $ne: 'verified' };
    }

    const suppliers = await Supplier.find(searchQuery)
      .skip(skip)
      .limit(limit)
      .sort({ 'ratings.average': -1 })
      .populate('userId', 'username email profile.avatar');

    const total = await Supplier.countDocuments(searchQuery);

    return {
      results: suppliers,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Search prices
   */
  async searchPrices(query, filters = {}, pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const { category, city, state, minPrice, maxPrice, supplierId } = filters;

    const skip = (page - 1) * limit;

    // First find matching materials
    const materialQuery = { isActive: true };
    if (query) {
      materialQuery.$text = { $search: query };
    }
    if (category) {
      materialQuery.category = category;
    }

    const materials = await Material.find(materialQuery).select('_id');
    const materialIds = materials.map(m => m._id);

    if (materialIds.length === 0) {
      return { results: [], total: 0, page, limit, pages: 0 };
    }

    // Build price query
    const priceQuery = {
      materialId: { $in: materialIds },
      isActive: true,
      stockQuantity: { $gt: 0 },
    };

    if (city) {
      priceQuery['location.city'] = city;
    }

    if (state) {
      priceQuery['location.state'] = state;
    }

    if (minPrice !== undefined) {
      priceQuery.price = { $gte: minPrice };
    }

    if (maxPrice !== undefined) {
      priceQuery.price = { ...priceQuery.price, $lte: maxPrice };
    }

    if (supplierId) {
      priceQuery.supplierId = supplierId;
    }

    const prices = await Price.find(priceQuery)
      .skip(skip)
      .limit(limit)
      .populate('materialId', 'name category unit')
      .populate('supplierId', 'profile.companyName profile.rating profile.verified')
      .sort({ price: 1 });

    const total = await Price.countDocuments(priceQuery);

    return {
      results: prices,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get material price info
   */
  async getMaterialPriceInfo(materialId, filters = {}) {
    const { city, state, minPrice, maxPrice } = filters;

    const match = {
      materialId,
      isActive: true,
      stockQuantity: { $gt: 0 },
    };

    if (city) {
      match['location.city'] = city;
    }

    if (state) {
      match['location.state'] = state;
    }

    if (minPrice) {
      match.price = { $gte: minPrice };
    }

    if (maxPrice) {
      match.price = { ...match.price, $lte: maxPrice };
    }

    const prices = await Price.find(match)
      .populate('supplierId', 'profile.companyName profile.rating profile.verified')
      .sort({ price: 1 });

    if (prices.length === 0) {
      return {
        count: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        suppliers: [],
      };
    }

    const supplierList = prices.map(p => ({
      supplier: p.supplierId,
      price: p.price,
      unit: p.unit,
      stockQuantity: p.stockQuantity,
      lastUpdated: p.lastUpdated,
    }));

    const sum = prices.reduce((a, b) => a + b.price, 0);

    return {
      count: prices.length,
      avgPrice: parseFloat((sum / prices.length).toFixed(2)),
      minPrice: prices[0].price,
      maxPrice: prices[prices.length - 1].price,
      suppliers: supplierList,
    };
  }

  /**
   * Autocomplete suggestions
   */
  async autocomplete(query, limit = 10) {
    if (!query || query.length < 2) {
      return { suggestions: [] };
    }

    // Get material suggestions
    const materials = await Material.find({
      name: { $regex: query, $options: 'i' },
      isActive: true,
    })
    .limit(limit)
    .select('name category');

    // Get supplier suggestions
    const suppliers = await Supplier.find({
      'business.name': { $regex: query, $options: 'i' },
      status: 'active',
    })
    .limit(limit)
    .select('business.name');

    const suggestions = [
      ...materials.map(m => ({
        type: 'material',
        label: m.name,
        value: m.name,
        category: m.category,
      })),
      ...suppliers.map(s => ({
        type: 'supplier',
        label: s.business.name,
        value: s.business.name,
      })),
    ];

    // Remove duplicates
    const unique = [];
    const seen = new Set();
    for (const item of suggestions) {
      const key = `${item.type}:${item.label}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return {
      suggestions: unique.slice(0, limit),
      query,
    };
  }

  /**
   * Get search filters
   */
  async getSearchFilters() {
    const [categories, brands, cities, states] = await Promise.all([
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

    return {
      categories: categories.filter(c => c).map(c => ({ value: c, label: c })),
      brands: brands.filter(b => b).map(b => ({ value: b, label: b })),
      cities: cities.filter(c => c).map(c => ({ value: c, label: c })),
      states: states.filter(s => s).map(s => ({ value: s, label: s })),
      priceRange: priceRange.length > 0 ? {
        min: Math.floor(priceRange[0].min),
        max: Math.ceil(priceRange[0].max),
      } : { min: 0, max: 1000 },
      sortOptions: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
        { value: 'rating', label: 'Highest Rated' },
        { value: 'name', label: 'Name A-Z' },
      ],
    };
  }
}

module.exports = new SearchService();
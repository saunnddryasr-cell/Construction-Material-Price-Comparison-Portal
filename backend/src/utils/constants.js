const ROLES = {
  CONTRACTOR: 'contractor',
  SUPPLIER: 'supplier',
  ADMIN: 'admin',
};

const MATERIAL_CATEGORIES = {
  CEMENT: 'cement',
  STEEL: 'steel',
  BRICKS: 'bricks',
  SAND: 'sand',
  AGGREGATES: 'aggregates',
  OTHERS: 'others',
};

const MATERIAL_UNITS = {
  BAG: 'bag',
  TON: 'ton',
  KG: 'kg',
  PIECE: 'piece',
  CUBIC_METER: 'cubic_meter',
};

const INQUIRY_STATUS = {
  PENDING: 'pending',
  RESPONDED: 'responded',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CLOSED: 'closed',
};

const PRICE_SORT_OPTIONS = {
  PRICE_ASC: 'price',
  PRICE_DESC: 'price-desc',
  RATING: 'rating',
  DISTANCE: 'distance',
};

const NOTIFICATION_TYPES = {
  PRICE_UPDATE: 'price_update',
  INQUIRY_RESPONSE: 'inquiry_response',
  SUPPLIER_VERIFIED: 'supplier_verified',
  PRICE_ALERT: 'price_alert',
};

module.exports = {
  ROLES,
  MATERIAL_CATEGORIES,
  MATERIAL_UNITS,
  INQUIRY_STATUS,
  PRICE_SORT_OPTIONS,
  NOTIFICATION_TYPES,
};
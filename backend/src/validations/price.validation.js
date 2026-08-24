const Joi = require('joi');

const priceUpdateValidation = (data) => {
  const schema = Joi.object({
    materialId: Joi.string().required(),
    price: Joi.number().min(0).required(),
    stockQuantity: Joi.number().min(0).required(),
    unit: Joi.string().required(),
    location: Joi.object({
      city: Joi.string().required(),
      state: Joi.string().required(),
      pincode: Joi.string(),
    }).required(),
    minimumOrderQuantity: Joi.number().min(1),
    deliveryOptions: Joi.object({
      available: Joi.boolean(),
      charges: Joi.number().min(0),
      area: Joi.string(),
      estimatedDays: Joi.number().min(1),
    }),
  });

  return schema.validate(data, { abortEarly: false });
};

const bulkPriceUpdateValidation = (data) => {
  const schema = Joi.object({
    prices: Joi.array().items(
      Joi.object({
        materialId: Joi.string().required(),
        price: Joi.number().min(0).required(),
        stockQuantity: Joi.number().min(0).required(),
        unit: Joi.string().required(),
        location: Joi.object({
          city: Joi.string().required(),
          state: Joi.string().required(),
        }).required(),
      })
    ).min(1).max(100).required(),
  });

  return schema.validate(data, { abortEarly: false });
};

module.exports = { priceUpdateValidation, bulkPriceUpdateValidation };
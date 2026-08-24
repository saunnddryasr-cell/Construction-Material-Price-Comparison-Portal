const Material = require('../src/models/Material.model');

const seedMaterials = async () => {
  const materials = [
    {
      name: 'Ordinary Portland Cement (OPC)',
      category: 'cement',
      unit: 'bag',
      specifications: {
        brand: 'ACC',
        grade: '53',
        weight: 50,
      },
      description: 'High quality OPC 53 grade cement for construction',
    },
    {
      name: 'TMT Steel Bars',
      category: 'steel',
      unit: 'ton',
      specifications: {
        grade: 'Fe 500',
        sizes: ['8mm', '10mm', '12mm', '16mm', '20mm'],
      },
      description: 'High strength TMT steel bars for reinforcement',
    },
    {
      name: 'Red Clay Bricks',
      category: 'bricks',
      unit: 'piece',
      specifications: {
        type: 'standard',
        dimensions: '230x115x75mm',
      },
      description: 'High quality red clay bricks for construction',
    },
    {
      name: 'River Sand',
      category: 'sand',
      unit: 'cubic_meter',
      specifications: {
        type: 'river sand',
        grade: 'fine',
      },
      description: 'Fine river sand for construction and plastering',
    },
    {
      name: 'Crushed Stone Aggregates',
      category: 'aggregates',
      unit: 'ton',
      specifications: {
        size: '20mm',
        type: 'crushed',
      },
      description: '20mm crushed stone aggregates for concrete',
    },
  ];

  for (const material of materials) {
    const existing = await Material.findOne({ name: material.name });
    if (!existing) {
      await Material.create(material);
      console.log(`Created material: ${material.name}`);
    }
  }
};

module.exports = seedMaterials;
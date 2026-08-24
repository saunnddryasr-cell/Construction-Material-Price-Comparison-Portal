import { useEffect, useMemo, useState } from 'react';
import { getMaterials } from '../api/material.api';
export const demoMaterials = [
  { id: 'cement', name: 'Portland Cement', category: 'Cement', unit: '50 kg bag', price: 7.45, suppliers: 14, trend: '-2.4%', icon: '◒' },
  { id: 'steel', name: 'TMT Steel Bar', category: 'Steel', unit: 'per kg', price: 0.82, suppliers: 21, trend: '+1.1%', icon: '▦' },
  { id: 'brick', name: 'Red Clay Brick', category: 'Masonry', unit: 'per 1,000', price: 468, suppliers: 9, trend: '-4.8%', icon: '▤' },
  { id: 'sand', name: 'River Sand', category: 'Aggregates', unit: 'per cu. yd.', price: 34, suppliers: 11, trend: '+0.6%', icon: '≋' },
  { id: 'lumber', name: 'Structural Lumber', category: 'Lumber', unit: 'per board ft.', price: 2.18, suppliers: 8, trend: '-3.2%', icon: '▥' },
  { id: 'gravel', name: 'Crushed Gravel', category: 'Aggregates', unit: 'per cu. yd.', price: 42, suppliers: 16, trend: '-1.5%', icon: '◆' }
];
export function useMaterials() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [remoteMaterials, setRemoteMaterials] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMaterials({ search: query || undefined, category: category === 'All' ? undefined : category })
      .then(({ data }) => {
        const materials = data?.data?.materials || data?.materials;
        if (active && Array.isArray(materials)) setRemoteMaterials(materials);
      })
      .catch(() => {
        if (active) setRemoteMaterials(null);
      }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, category]);

  const materials = useMemo(() => (remoteMaterials || demoMaterials)
    .filter((item) => (category === 'All' || item.category === category)
      && item.name.toLowerCase().includes(query.toLowerCase())), [query, category, remoteMaterials]);

  return { materials, query, setQuery, category, setCategory, loading };
}

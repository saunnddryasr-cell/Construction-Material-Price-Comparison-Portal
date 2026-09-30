import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../components/common/Button';
import { createInquiry } from '../api/inquiry.api';
import { getMaterials } from '../api/material.api';
import { getSuppliers } from '../api/supplier.api';

export default function InquiryPage() {
  const [searchParams] = useSearchParams();
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    Promise.all([getMaterials(), getSuppliers()])
      .then(([materialResponse, supplierResponse]) => {
        const materialList = materialResponse.data?.data?.materials;
        const supplierList = supplierResponse.data?.data?.suppliers;
        if (!Array.isArray(materialList) || !Array.isArray(supplierList)) {
          throw new Error('Invalid inquiry form data');
        }
        if (active) {
          setMaterials(materialList);
          setSuppliers(supplierList);
        }
      })
      .catch(() => {
        if (active) setError('Unable to load materials and suppliers from the backend.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const form = new FormData(event.currentTarget);
    try {
      await createInquiry({
        materialId: form.get('materialId'),
        supplierId: form.get('supplierId'),
        quantity: Number(form.get('quantity')),
        message: form.get('message'),
      });
      setSent(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'Could not save the inquiry. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container"><div className="empty">Loading materials and suppliers...</div></div>;
  }

  if (sent) {
    return (
      <div className="container">
        <div className="form-wrap panel">
          <span className="eyebrow">Inquiry sent</span>
          <h1>Your request was recorded.</h1>
          <p className="section-intro">The supplier can now respond to your quote request.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="form-wrap">
        <span className="eyebrow">Supplier inquiry</span>
        <h1>Tell us what you need.</h1>
        {error && <p className="api-error" role="alert">{error}</p>}
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Supplier
            <select
              name="supplierId"
              className="form-input"
              defaultValue={searchParams.get('supplierId') || ''}
              required
            >
              <option value="" disabled>Select a supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </label>
          <label>
            Material
            <select name="materialId" className="form-input" required>
              <option value="" disabled>Select a material</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name} ({material.unit})
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input
              name="quantity"
              className="form-input"
              type="number"
              min="1"
              step="1"
              required
              placeholder="e.g. 250"
            />
          </label>
          <label>
            Project notes
            <textarea
              name="message"
              className="form-input"
              minLength="1"
              maxLength="1000"
              required
              placeholder="Delivery timing, grade, or other details"
            />
          </label>
          <Button disabled={submitting || !materials.length || !suppliers.length}>
            {submitting ? 'Sending inquiry...' : 'Send inquiry'}
          </Button>
        </form>
      </div>
    </div>
  );
}

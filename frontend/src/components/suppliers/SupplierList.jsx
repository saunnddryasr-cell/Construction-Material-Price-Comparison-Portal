import SupplierCard from './SupplierCard';
export default function SupplierList({ suppliers }) { return <div className="material-grid">{(suppliers || []).map((supplier) => <SupplierCard key={supplier.id} supplier={supplier} />)}</div>; }

import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin } from 'lucide-react';
export default function SupplierCard({ supplier = { id: 'northline', name: 'Northline Materials', city: 'Austin, TX', rating: 4.8 } }) { return <article className="material-card"><BadgeCheck color="#285b48" /><h3>{supplier.name}</h3><p><MapPin size={14} /> {supplier.city}</p><div className="card-meta"><span>★ {supplier.rating}</span><Link className="best" to={`/suppliers/${supplier.id}`}>View profile</Link></div></article>; }

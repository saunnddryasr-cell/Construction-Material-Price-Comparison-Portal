import { useMaterials } from '../hooks/useMaterials';
import MaterialFilter from '../components/materials/MaterialFilter';
import MaterialList from '../components/materials/MaterialList';
export default function MaterialsPage() { const data = useMaterials(); return <div className="container"><header className="page-header"><span className="eyebrow">Material directory</span><h1>Find what your project needs.</h1><p className="section-intro">Browse current pricing across the categories contractors source most.</p></header><MaterialFilter {...data} /><MaterialList materials={data.materials} loading={data.loading} /></div>; }

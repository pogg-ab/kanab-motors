import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Tag,
  Percent,
  Layers,
  Car,
  AlertTriangle,
  CheckCircle2,
  X,
  Boxes,
} from 'lucide-react';
import {
  api,
  ProductItem,
  ProductCategory,
  Brand,
  UnitOfMeasure,
  TaxConfiguration,
} from '../../api/client';

export const ProductsPage: React.FC = () => {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
  const [taxConfigs, setTaxConfigs] = useState<TaxConfiguration[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('0');

  // Form State
  const [formData, setFormData] = useState({
    itemCode: '',
    itemName: '',
    categoryId: '' as string | number,
    brandId: '' as string | number,
    model: '',
    uomId: '' as string | number,
    sellingPrice: '',
    taxConfigId: '' as string | number,
    reorderLevel: '5',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchReferenceData = async () => {
    try {
      const [cats, brs, uomList, taxes] = await Promise.all([
        api.getCategories(),
        api.getBrands(),
        api.getUoms(),
        api.getTaxConfigs(),
      ]);
      setCategories(cats);
      setBrands(brs);
      setUoms(uomList);
      setTaxConfigs(taxes);
    } catch (err) {
      console.error('Failed to load reference data:', err);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCat !== 'ALL') params.categoryId = Number(selectedCat);
      if (selectedBrand !== 'ALL') params.brandId = Number(selectedBrand);
      if (search.trim()) params.search = search.trim();

      const res = await api.getItems(params);
      setItems(res.items);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [selectedCat, selectedBrand, search]);

  const handleOpenCreate = async () => {
    let currentTaxes = taxConfigs;
    let currentCats = categories;
    let currentBrands = brands;
    let currentUoms = uoms;

    try {
      const [cats, brs, uomList, taxes] = await Promise.all([
        api.getCategories(),
        api.getBrands(),
        api.getUoms(),
        api.getTaxConfigs(),
      ]);
      setCategories(cats);
      setBrands(brs);
      setUoms(uomList);
      setTaxConfigs(taxes);
      currentTaxes = taxes;
      currentCats = cats;
      currentBrands = brs;
      currentUoms = uomList;
    } catch (e) {
      console.error('Failed refreshing reference data on open:', e);
    }

    setFormData({
      itemCode: '',
      itemName: '',
      categoryId: currentCats[0]?.categoryId || '',
      brandId: currentBrands[0]?.brandId || '',
      model: '',
      uomId: currentUoms[0]?.uomId || '',
      sellingPrice: '',
      taxConfigId: currentTaxes[0]?.taxConfigId || '',
      reorderLevel: '5',
    });
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const price = parseFloat(formData.sellingPrice);
    if (isNaN(price) || price <= 0) {
      setFormError('Selling price must be a valid number greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      await api.createItem({
        itemCode: formData.itemCode.trim().toUpperCase(),
        itemName: formData.itemName.trim(),
        categoryId: Number(formData.categoryId),
        brandId: formData.brandId ? Number(formData.brandId) : undefined,
        model: formData.model.trim() || undefined,
        uomId: Number(formData.uomId),
        sellingPrice: price,
        taxConfigId: formData.taxConfigId ? Number(formData.taxConfigId) : undefined,
        reorderLevel: Number(formData.reorderLevel) || 0,
      });
      setIsCreateOpen(false);
      fetchItems();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create product item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.createCategory(newCatName.trim().toUpperCase());
      setNewCatName('');
      setIsCategoryModalOpen(false);
      fetchReferenceData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create category');
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    try {
      await api.createBrand(newBrandName.trim());
      setNewBrandName('');
      setIsBrandModalOpen(false);
      fetchReferenceData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create brand');
    }
  };

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaxName.trim()) return;
    try {
      await api.createTaxConfig(newTaxName.trim(), parseFloat(newTaxRate) || 0);
      setNewTaxName('');
      setNewTaxRate('0');
      setIsTaxModalOpen(false);
      fetchReferenceData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create tax configuration');
    }
  };

  // Metrics
  const totalModels = items.length;
  const motorcycles = items.filter((i) => i.category?.categoryName === 'MOTORCYCLE').length;
  const threeWheelers = items.filter((i) => i.category?.categoryName === 'THREE_WHEELER').length;
  const totalPhysicalUnits = items.reduce((sum, item) => sum + (item.totalUnits || 0), 0);

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Breadcrumbs & Top Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>★ Core Masters</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span>Product Catalog</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-primary)' }}>Vehicle Models & Inventory</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.4rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                  Product & Vehicle Master Data
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                  <span className="mono-code" style={{ fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                    Catalog Master
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Master catalog of motorcycles, three-wheelers, and imported vehicles with tax & pricing rules
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setIsCategoryModalOpen(true)}>
              + Category
            </button>
            <button className="btn btn-secondary" onClick={() => setIsBrandModalOpen(true)}>
              + Brand
            </button>
            <button className="btn btn-secondary" onClick={() => setIsTaxModalOpen(true)}>
              + Tax Rate
            </button>
            <button className="btn btn-cyan" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={17} /> New Product Item
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}>
        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-indigo)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Models</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-indigo)' }}>
              <Package size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {totalModels}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Registered SKU/Models
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-cyan)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Motorcycle Models</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
              <Car size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {motorcycles}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Boxer, Lifan & Haojue
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-amber)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Three-Wheeled Models</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)' }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {threeWheelers}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Bajaj Maxima, TVS King
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-emerald)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chassis Physical Units</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
              <Boxes size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {totalPhysicalUnits}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            In warehouse inventory
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select
              className="input"
              style={{ width: '190px', height: '38px', fontSize: '0.85rem' }}
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.categoryName}
                </option>
              ))}
            </select>

            <select
              className="input"
              style={{ width: '170px', height: '38px', fontSize: '0.85rem' }}
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
            >
              <option value="ALL">All Brands</option>
              {brands.map((b) => (
                <option key={b.brandId} value={b.brandId}>
                  {b.brandName}
                </option>
              ))}
            </select>
          </div>

          <div style={{ position: 'relative', width: '320px' }}>
            <Search
              size={16}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '2.4rem', height: '38px', fontSize: '0.85rem' }}
              placeholder="Search code, item name, model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Product Items Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#090D16', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Code</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product / Vehicle Model</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brand</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selling Price</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tax Config</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Physical Stock</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reorder Alert</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading product catalog...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No product models found. Click "+ New Product Item" to register your first model.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.itemId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span className="mono-code" style={{ color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.08)' }}>
                        {item.itemCode}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.itemName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Model: {item.model || 'Standard'} · UoM: {item.uom?.uomName || 'UNIT'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span className="badge badge-indigo">
                        {item.category?.categoryName || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span className="badge badge-cyan">
                        {item.brand?.brandName || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        ETB {Number(item.sellingPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      <span className="badge badge-emerald">
                        <Percent size={11} /> {item.taxConfig?.taxName || 'VAT 15%'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                        <span className="mono-code" style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>
                          {item.totalUnits ?? 0}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>units</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      {(item.totalUnits ?? 0) <= item.reorderLevel ? (
                        <span className="badge badge-rose">
                          <AlertTriangle size={12} /> Low (≤{item.reorderLevel})
                        </span>
                      ) : (
                        <span className="badge badge-emerald">
                          <CheckCircle2 size={12} /> Adequate
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PRODUCT MODAL */}
      {isCreateOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Package size={20} color="var(--accent-indigo)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Register Product Item (Model)</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Add vehicle model or motorcycle specifications to master catalog
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateItem}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-banner-danger">
                    {formError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Item Code (SKU / Model Code) *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. KB-MC-BOXER150"
                      required
                      value={formData.itemCode}
                      onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Item Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Bajaj Boxer BM 150 Motorcycle"
                      required
                      value={formData.itemName}
                      onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Vehicle Category *</label>
                    <select
                      className="select-field"
                      required
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    >
                      {categories.map((c) => (
                        <option key={c.categoryId} value={c.categoryId}>
                          {c.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Brand</label>
                    <select
                      className="select-field"
                      value={formData.brandId}
                      onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                    >
                      <option value="">Select Brand</option>
                      {brands.map((b) => (
                        <option key={b.brandId} value={b.brandId}>
                          {b.brandName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Model Specifics</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Boxer BM 150cc 4-Speed"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit of Measure (UoM) *</label>
                    <select
                      className="select-field"
                      required
                      value={formData.uomId}
                      onChange={(e) => setFormData({ ...formData, uomId: e.target.value })}
                    >
                      {uoms.map((u) => (
                        <option key={u.uomId} value={u.uomId}>
                          {u.uomName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Selling Price (ETB) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      placeholder="e.g. 185000.00"
                      required
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">VAT / Tax Configuration</label>
                    <select
                      className="select-field"
                      value={formData.taxConfigId}
                      onChange={(e) => setFormData({ ...formData, taxConfigId: e.target.value })}
                    >
                      {taxConfigs.map((t) => (
                        <option key={t.taxConfigId} value={t.taxConfigId}>
                          {t.taxName} ({t.taxRatePct}%)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reorder Level (Alert Threshold)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="5"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-cyan" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Register Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>+ Add Product Category</h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCategory}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Category Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. ELECTRIC_VEHICLE"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCategoryModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-cyan">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD BRAND MODAL */}
      {isBrandModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>+ Add Brand</h3>
              <button
                onClick={() => setIsBrandModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateBrand}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Brand Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Hero MotoCorp"
                    required
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsBrandModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-cyan">
                  Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD TAX RATE MODAL */}
      {isTaxModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>+ Add VAT / Tax Configuration</h3>
              <button
                onClick={() => setIsTaxModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTax}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Tax Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Zero VAT, Luxury Tax"
                    required
                    value={newTaxName}
                    onChange={(e) => setNewTaxName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tax Rate (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="input-field"
                    placeholder="0"
                    required
                    value={newTaxRate}
                    onChange={(e) => setNewTaxRate(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsTaxModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-cyan">
                  Save Tax Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

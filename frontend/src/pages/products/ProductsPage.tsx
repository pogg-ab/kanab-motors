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
  Edit2,
  Trash2,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  api,
  ProductItem,
  ProductCategory,
  Brand,
  UnitOfMeasure,
  TaxConfiguration,
} from '../../api/client';
import { usePermissions } from '../../authz/usePermissions';
import { useModal } from '../../context/ModalContext';

export const ProductsPage: React.FC = () => {
  const { showConfirm, showAlert } = useModal();
  const { can } = usePermissions();
  const canCreateProduct = can('PRODUCTS_CREATE');
  const canEditProduct = can('PRODUCTS_EDIT') || can('PRODUCTS_CREATE');
  const canManageCategories = can('PRODUCTS_CATEGORIES_MANAGE');
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

  // Modals & Reference Data Management
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    itemCode: '',
    itemName: '',
    categoryId: '' as string | number,
    brandId: '' as string | number,
    model: '',
    uomId: '' as string | number,
    sellingPrice: '',
    taxConfigId: '' as string | number,
    reorderLevel: '5',
    weightKg: '',
  });
  const [editProductError, setEditProductError] = useState<string | null>(null);
  const [editProductSubmitting, setEditProductSubmitting] = useState(false);

  // Category Management State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [catActionError, setCatActionError] = useState<string | null>(null);
  const [catSaving, setCatSaving] = useState(false);

  // Brand Management State
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);
  const [editingBrandName, setEditingBrandName] = useState('');
  const [brandActionError, setBrandActionError] = useState<string | null>(null);
  const [brandSaving, setBrandSaving] = useState(false);

  // Tax Rate Management State
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('0');
  const [editingTaxId, setEditingTaxId] = useState<number | null>(null);
  const [editingTaxName, setEditingTaxName] = useState('');
  const [editingTaxRate, setEditingTaxRate] = useState('0');
  const [taxActionError, setTaxActionError] = useState<string | null>(null);
  const [taxSaving, setTaxSaving] = useState(false);

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
    weightKg: '',
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
    if (!canCreateProduct) return;
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
      weightKg: '',
    });
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateProduct) return;
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
        weightKg: formData.weightKg ? Number(formData.weightKg) : undefined,
      });
      setIsCreateOpen(false);
      fetchItems();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create product item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditProduct = (item: ProductItem) => {
    setEditingProduct(item);
    setEditFormData({
      itemCode: item.itemCode,
      itemName: item.itemName,
      categoryId: item.categoryId || (item.category?.categoryId ?? ''),
      brandId: item.brandId || (item.brand?.brandId ?? ''),
      model: item.model || '',
      uomId: item.uomId || (item.uom?.uomId ?? ''),
      sellingPrice: String(item.sellingPrice ?? ''),
      taxConfigId: item.taxConfigId || (item.taxConfig?.taxConfigId ?? ''),
      reorderLevel: String(item.reorderLevel ?? '5'),
      weightKg: item.weightKg !== undefined && item.weightKg !== null ? String(item.weightKg) : '',
    });
    setEditProductError(null);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setEditProductError(null);

    const price = parseFloat(editFormData.sellingPrice);
    if (isNaN(price) || price <= 0) {
      setEditProductError('Selling price must be a valid positive number');
      return;
    }

    setEditProductSubmitting(true);
    try {
      await api.updateItem(editingProduct.itemId, {
        itemCode: editFormData.itemCode.trim().toUpperCase(),
        itemName: editFormData.itemName.trim(),
        categoryId: Number(editFormData.categoryId),
        brandId: editFormData.brandId ? Number(editFormData.brandId) : undefined,
        model: editFormData.model.trim() || undefined,
        uomId: Number(editFormData.uomId),
        sellingPrice: price,
        taxConfigId: editFormData.taxConfigId ? Number(editFormData.taxConfigId) : undefined,
        reorderLevel: Number(editFormData.reorderLevel) || 0,
        weightKg: editFormData.weightKg ? Number(editFormData.weightKg) : undefined,
      });
      setEditingProduct(null);
      await fetchItems();
    } catch (err: any) {
      setEditProductError(err.response?.data?.message || 'Failed to update product item');
    } finally {
      setEditProductSubmitting(false);
    }
  };

  // --- Category CRUD Handlers ---
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCategories) return;
    if (!newCatName.trim()) return;
    setCatSaving(true);
    setCatActionError(null);
    try {
      await api.createCategory(newCatName.trim().toUpperCase());
      setNewCatName('');
      await fetchReferenceData();
      await fetchItems();
    } catch (err: any) {
      setCatActionError(err.response?.data?.message || 'Failed to create category');
    } finally {
      setCatSaving(false);
    }
  };

  const handleStartEditCategory = (cat: ProductCategory) => {
    setEditingCatId(cat.categoryId);
    setEditingCatName(cat.categoryName);
    setCatActionError(null);
  };

  const handleCancelEditCategory = () => {
    setEditingCatId(null);
    setEditingCatName('');
    setCatActionError(null);
  };

  const handleSaveEditCategory = async (id: number) => {
    if (!editingCatName.trim()) return;
    setCatSaving(true);
    setCatActionError(null);
    try {
      await api.updateCategory(id, editingCatName.trim().toUpperCase());
      setEditingCatId(null);
      setEditingCatName('');
      await fetchReferenceData();
      await fetchItems();
    } catch (err: any) {
      setCatActionError(err.response?.data?.message || 'Failed to update category');
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: ProductCategory) => {
    const confirmed = await showConfirm({
      title: 'Delete Product Category',
      message: `Are you sure you want to delete category "${cat.categoryName}"? Existing product associations must be cleared first.`,
      confirmText: 'Delete Category',
      variant: 'danger',
    });
    if (!confirmed) return;
    setCatActionError(null);
    try {
      await api.deleteCategory(cat.categoryId);
      await fetchReferenceData();
      await fetchItems();
    } catch (err: any) {
      setCatActionError(err.response?.data?.message || 'Failed to delete category');
    }
  };

  // --- Brand CRUD Handlers ---
  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCategories) return;
    if (!newBrandName.trim()) return;
    setBrandSaving(true);
    setBrandActionError(null);
    try {
      await api.createBrand(newBrandName.trim());
      setNewBrandName('');
      await fetchReferenceData();
      await fetchItems();
    } catch (err: any) {
      setBrandActionError(err.response?.data?.message || 'Failed to create brand');
    } finally {
      setBrandSaving(false);
    }
  };

  const handleStartEditBrand = (brand: Brand) => {
    setEditingBrandId(brand.brandId);
    setEditingBrandName(brand.brandName);
    setBrandActionError(null);
  };

  const handleCancelEditBrand = () => {
    setEditingBrandId(null);
    setEditingBrandName('');
    setBrandActionError(null);
  };

  const handleSaveEditBrand = async (id: number) => {
    if (!editingBrandName.trim()) return;
    setBrandSaving(true);
    setBrandActionError(null);
    try {
      await api.updateBrand(id, editingBrandName.trim());
      setEditingBrandId(null);
      setEditingBrandName('');
      await fetchReferenceData();
      await fetchItems();
    } catch (err: any) {
      setBrandActionError(err.response?.data?.message || 'Failed to update brand');
    } finally {
      setBrandSaving(false);
    }
  };

  const handleDeleteBrand = async (brand: Brand) => {
    const confirmed = await showConfirm({
      title: 'Delete Brand',
      message: `Are you sure you want to delete brand "${brand.brandName}"?`,
      confirmText: 'Delete Brand',
      variant: 'danger',
    });
    if (!confirmed) return;
    setBrandActionError(null);
    try {
      await api.deleteBrand(brand.brandId);
      await fetchReferenceData();
      await fetchItems();
    } catch (err: any) {
      setBrandActionError(err.response?.data?.message || 'Failed to delete brand');
    }
  };

  // --- Tax Configuration CRUD Handlers ---
  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCategories) return;
    if (!newTaxName.trim()) return;
    setTaxSaving(true);
    setTaxActionError(null);
    try {
      await api.createTaxConfig(newTaxName.trim(), parseFloat(newTaxRate) || 0);
      setNewTaxName('');
      setNewTaxRate('0');
      await fetchReferenceData();
      await fetchItems();
    } catch (err: any) {
      setTaxActionError(err.response?.data?.message || 'Failed to create tax configuration');
    } finally {
      setTaxSaving(false);
    }
  };

  const handleStartEditTax = (tax: TaxConfiguration) => {
    setEditingTaxId(tax.taxConfigId);
    setEditingTaxName(tax.taxName);
    setEditingTaxRate(String(tax.taxRatePct));
    setTaxActionError(null);
  };

  const handleCancelEditTax = () => {
    setEditingTaxId(null);
    setEditingTaxName('');
    setEditingTaxRate('0');
    setTaxActionError(null);
  };

  const handleSaveEditTax = async (id: number) => {
    if (!editingTaxName.trim()) return;
    setTaxSaving(true);
    setTaxActionError(null);
    try {
      await api.updateTaxConfig(id, {
        name: editingTaxName.trim(),
        ratePct: parseFloat(editingTaxRate) || 0,
      });
      setEditingTaxId(null);
      setEditingTaxName('');
      await fetchReferenceData();
      await fetchItems();
    } catch (err: any) {
      setTaxActionError(err.response?.data?.message || 'Failed to update tax configuration');
    } finally {
      setTaxSaving(false);
    }
  };

  const handleDeleteTax = async (tax: TaxConfiguration) => {
    const confirmed = await showConfirm({
      title: 'Delete Tax Rate Configuration',
      message: `Are you sure you want to delete tax rate "${tax.taxName}" (${tax.taxRatePct}%)?`,
      confirmText: 'Delete Tax Rate',
      variant: 'danger',
    });
    if (!confirmed) return;
    setTaxActionError(null);
    try {
      await api.deleteTaxConfig(tax.taxConfigId);
      await fetchReferenceData();
      await fetchItems();
    } catch (err: any) {
      setTaxActionError(err.response?.data?.message || 'Failed to delete tax configuration');
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
            {canManageCategories && (
              <>
                <button className="btn btn-secondary" onClick={() => setIsCategoryModalOpen(true)}>
                  + Category
                </button>
                <button className="btn btn-secondary" onClick={() => setIsBrandModalOpen(true)}>
                  + Brand
                </button>
                <button className="btn btn-secondary" onClick={() => setIsTaxModalOpen(true)}>
                  + Tax Rate
                </button>
              </>
            )}
            {canCreateProduct && (
              <button className="btn btn-cyan" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={17} /> New Product Item
              </button>
            )}
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
              <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Code</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product / Vehicle Model</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brand</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selling Price</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tax Config</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Physical Stock</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reorder Alert</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading product catalog...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
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
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      {canEditProduct && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEditProduct(item)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            padding: '0.35rem 0.65rem',
                          }}
                          title="Edit Product Model"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
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
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

                  <div className="form-group">
                    <label className="form-label">Weight per Unit (KG)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="input-field"
                      placeholder="e.g. 145.50"
                      value={formData.weightKg}
                      onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                    />
                  </div>
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

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
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
                  <Edit2 size={20} color="var(--accent-indigo)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Edit Product Item (Model)</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Update specifications and pricing for {editingProduct.itemName} ({editingProduct.itemCode})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct}>
              <div className="modal-body">
                {editProductError && (
                  <div className="alert-banner-danger">
                    {editProductError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Item Code (SKU / Model Code) *</label>
                    <input
                      type="text"
                      className="input-field"
                      required
                      value={editFormData.itemCode}
                      onChange={(e) => setEditFormData({ ...editFormData, itemCode: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Item Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      required
                      value={editFormData.itemName}
                      onChange={(e) => setEditFormData({ ...editFormData, itemName: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Vehicle Category *</label>
                    <select
                      className="select-field"
                      required
                      value={editFormData.categoryId}
                      onChange={(e) => setEditFormData({ ...editFormData, categoryId: e.target.value })}
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
                      value={editFormData.brandId}
                      onChange={(e) => setEditFormData({ ...editFormData, brandId: e.target.value })}
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
                      value={editFormData.model}
                      onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit of Measure (UoM) *</label>
                    <select
                      className="select-field"
                      required
                      value={editFormData.uomId}
                      onChange={(e) => setEditFormData({ ...editFormData, uomId: e.target.value })}
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
                      required
                      value={editFormData.sellingPrice}
                      onChange={(e) => setEditFormData({ ...editFormData, sellingPrice: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">VAT / Tax Configuration</label>
                    <select
                      className="select-field"
                      value={editFormData.taxConfigId}
                      onChange={(e) => setEditFormData({ ...editFormData, taxConfigId: e.target.value })}
                    >
                      {taxConfigs.map((t) => (
                        <option key={t.taxConfigId} value={t.taxConfigId}>
                          {t.taxName} ({t.taxRatePct}%)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Reorder Level (Alert Threshold)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={editFormData.reorderLevel}
                      onChange={(e) => setEditFormData({ ...editFormData, reorderLevel: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Weight per Unit (KG)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="input-field"
                      value={editFormData.weightKg}
                      onChange={(e) => setEditFormData({ ...editFormData, weightKg: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingProduct(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-indigo" disabled={editProductSubmitting}>
                  {editProductSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT CATEGORIES MANAGER MODAL */}
      {isCategoryModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(6, 182, 212, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-cyan)',
                  }}
                >
                  <Layers size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Product Categories Manager</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {categories.length} registered vehicle & parts categories
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCatId(null);
                  setCatActionError(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {catActionError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: '#f87171',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={16} />
                    <span>{catActionError}</span>
                  </div>
                  <button
                    onClick={() => setCatActionError(null)}
                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Add New Category Card */}
              <div
                style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                  + ADD NEW CATEGORY
                </div>
                <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '0.6rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. ELECTRIC_VEHICLE, ACCESSORIES"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-cyan" disabled={catSaving} style={{ whiteSpace: 'nowrap' }}>
                    {catSaving ? 'Adding...' : '+ Add Category'}
                  </button>
                </form>
              </div>

              {/* Existing Categories List */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                  EXISTING CATEGORIES ({categories.length})
                </div>
                <div
                  style={{
                    maxHeight: '280px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-table)',
                  }}
                >
                  {categories.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No categories found. Create one above.
                    </div>
                  ) : (
                    categories.map((cat, idx) => (
                      <div
                        key={cat.categoryId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 1rem',
                          borderBottom: idx < categories.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                          background: editingCatId === cat.categoryId ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                        }}
                      >
                        {editingCatId === cat.categoryId ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                            <input
                              type="text"
                              className="input-field"
                              value={editingCatName}
                              onChange={(e) => setEditingCatName(e.target.value)}
                              style={{ flex: 1, padding: '0.4rem 0.65rem', fontSize: '0.85rem' }}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="btn btn-cyan btn-sm"
                              onClick={() => handleSaveEditCategory(cat.categoryId)}
                              disabled={catSaving}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
                            >
                              <Check size={13} /> Save
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={handleCancelEditCategory}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
                            >
                              <RotateCcw size={13} /> Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span className="mono-code" style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600 }}>
                                {cat.categoryName}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                #{cat.categoryId}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleStartEditCategory(cat)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                                title="Edit Category"
                              >
                                <Edit2 size={12} /> Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDeleteCategory(cat)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  fontSize: '0.75rem',
                                  padding: '0.35rem 0.6rem',
                                  color: '#f87171',
                                  borderColor: 'rgba(239, 68, 68, 0.3)',
                                }}
                                title="Delete Category"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCatId(null);
                  setCatActionError(null);
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT BRANDS MANAGER MODAL */}
      {isBrandModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-blue)',
                  }}
                >
                  <Car size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Product Brands Manager</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {brands.length} registered vehicle & equipment brands
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsBrandModalOpen(false);
                  setEditingBrandId(null);
                  setBrandActionError(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {brandActionError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: '#f87171',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={16} />
                    <span>{brandActionError}</span>
                  </div>
                  <button
                    onClick={() => setBrandActionError(null)}
                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Add New Brand Card */}
              <div
                style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                  + ADD NEW BRAND
                </div>
                <form onSubmit={handleCreateBrand} style={{ display: 'flex', gap: '0.6rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Hero MotoCorp, Bajaj, TVS"
                    required
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-cyan" disabled={brandSaving} style={{ whiteSpace: 'nowrap' }}>
                    {brandSaving ? 'Adding...' : '+ Add Brand'}
                  </button>
                </form>
              </div>

              {/* Existing Brands List */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                  EXISTING BRANDS ({brands.length})
                </div>
                <div
                  style={{
                    maxHeight: '280px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-table)',
                  }}
                >
                  {brands.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No brands found. Create one above.
                    </div>
                  ) : (
                    brands.map((brand, idx) => (
                      <div
                        key={brand.brandId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 1rem',
                          borderBottom: idx < brands.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                          background: editingBrandId === brand.brandId ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                        }}
                      >
                        {editingBrandId === brand.brandId ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                            <input
                              type="text"
                              className="input-field"
                              value={editingBrandName}
                              onChange={(e) => setEditingBrandName(e.target.value)}
                              style={{ flex: 1, padding: '0.4rem 0.65rem', fontSize: '0.85rem' }}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="btn btn-cyan btn-sm"
                              onClick={() => handleSaveEditBrand(brand.brandId)}
                              disabled={brandSaving}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
                            >
                              <Check size={13} /> Save
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={handleCancelEditBrand}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
                            >
                              <RotateCcw size={13} /> Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                {brand.brandName}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                #{brand.brandId}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleStartEditBrand(brand)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                                title="Edit Brand"
                              >
                                <Edit2 size={12} /> Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDeleteBrand(brand)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  fontSize: '0.75rem',
                                  padding: '0.35rem 0.6rem',
                                  color: '#f87171',
                                  borderColor: 'rgba(239, 68, 68, 0.3)',
                                }}
                                title="Delete Brand"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsBrandModalOpen(false);
                  setEditingBrandId(null);
                  setBrandActionError(null);
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VAT / TAX CONFIGURATIONS MANAGER MODAL */}
      {isTaxModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-amber)',
                  }}
                >
                  <Percent size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>VAT & Tax Configurations</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {taxConfigs.length} configured tax tiers
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsTaxModalOpen(false);
                  setEditingTaxId(null);
                  setTaxActionError(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {taxActionError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: '#f87171',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={16} />
                    <span>{taxActionError}</span>
                  </div>
                  <button
                    onClick={() => setTaxActionError(null)}
                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Add New Tax Config Card */}
              <div
                style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                  + ADD NEW TAX CONFIGURATION
                </div>
                <form onSubmit={handleCreateTax} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.6rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Tax Name (e.g. Standard VAT)"
                    required
                    value={newTaxName}
                    onChange={(e) => setNewTaxName(e.target.value)}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="input-field"
                    placeholder="Rate % (e.g. 15)"
                    required
                    value={newTaxRate}
                    onChange={(e) => setNewTaxRate(e.target.value)}
                  />
                  <button type="submit" className="btn btn-cyan" disabled={taxSaving} style={{ whiteSpace: 'nowrap' }}>
                    {taxSaving ? 'Adding...' : '+ Add Rate'}
                  </button>
                </form>
              </div>

              {/* Existing Tax Configurations List */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                  CONFIGURED TAX TIERS ({taxConfigs.length})
                </div>
                <div
                  style={{
                    maxHeight: '280px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-table)',
                  }}
                >
                  {taxConfigs.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No tax configurations found.
                    </div>
                  ) : (
                    taxConfigs.map((tax, idx) => (
                      <div
                        key={tax.taxConfigId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 1rem',
                          borderBottom: idx < taxConfigs.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                          background: editingTaxId === tax.taxConfigId ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                        }}
                      >
                        {editingTaxId === tax.taxConfigId ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto auto', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="input-field"
                              value={editingTaxName}
                              onChange={(e) => setEditingTaxName(e.target.value)}
                              style={{ padding: '0.4rem 0.65rem', fontSize: '0.85rem' }}
                              autoFocus
                            />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              className="input-field"
                              value={editingTaxRate}
                              onChange={(e) => setEditingTaxRate(e.target.value)}
                              style={{ padding: '0.4rem 0.65rem', fontSize: '0.85rem' }}
                            />
                            <button
                              type="button"
                              className="btn btn-cyan btn-sm"
                              onClick={() => handleSaveEditTax(tax.taxConfigId)}
                              disabled={taxSaving}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
                            >
                              <Check size={13} /> Save
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={handleCancelEditTax}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
                            >
                              <RotateCcw size={13} /> Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                {tax.taxName}
                              </span>
                              <span className="badge badge-amber" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                {tax.taxRatePct}%
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                #{tax.taxConfigId}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleStartEditTax(tax)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                                title="Edit Tax Configuration"
                              >
                                <Edit2 size={12} /> Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDeleteTax(tax)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  fontSize: '0.75rem',
                                  padding: '0.35rem 0.6rem',
                                  color: '#f87171',
                                  borderColor: 'rgba(239, 68, 68, 0.3)',
                                }}
                                title="Delete Tax Configuration"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsTaxModalOpen(false);
                  setEditingTaxId(null);
                  setTaxActionError(null);
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

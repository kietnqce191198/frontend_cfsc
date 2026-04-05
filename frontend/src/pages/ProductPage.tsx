import { useEffect, useState } from "react";
import { productApi } from "../services/api";
import { Product, ProductIngredient, Ingredient } from "../types/product";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../assets/product.css";
import "../assets/ingredients-table.css";
import '@fortawesome/fontawesome-free/css/all.min.css';
import ProductImageManager from "../components/ProductImageManager";

const ProductPage = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [productIngredients, setProductIngredients] = useState<ProductIngredient[]>([]);
    const [search, setSearch] = useState<string>("");
    const [filterStatus, setFilterStatus] = useState<string>("");
    const [filterAvailable, setFilterAvailable] = useState<string>("");
    const [activeProduct, setActiveProduct] = useState(null);
    const [searchResults, setSearchResults] = useState([]);

    // UI Modals States
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showIngredientModal, setShowIngredientModal] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [successPopup, setSuccessPopup] = useState({ show: false, message: "" });

    // Mode State (Create vs Update)
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentProductId, setCurrentProductId] = useState<number | null>(null);

    // Ingredient management state
    const [ingredientForm, setIngredientForm] = useState({
        ingredient_id: "",
        quantity: "",
        unit: "",
        name: ""
    });
    const [ingredientErrors, setIngredientErrors] = useState<any>({});

    // Tag management state
    const [tags, setTags] = useState<any[]>([]);
    const [productTags, setProductTags] = useState<any[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Bulk category assignment state
    const [bulkCategories, setBulkCategories] = useState<any[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("");

    const navigate = useNavigate();
    const [errors, setErrors] = useState<any>({});
    const [form, setForm] = useState({
        name: "", sku: "", price: "", category_id: "",
        description: "", is_available: true, preparation_time: ""
    });

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        fetchBulkCategories();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await productApi.getAll();
            setProducts(res?.data?.data || []);
        } catch (err) {
            toast.error("Failed to load products.");
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await productApi.getAllCate();
            setCategories(res?.data?.data || res?.data || []);
        } catch (err) {
            console.error("Fetch categories error:", err);
        }
    };

    const fetchBulkCategories = async () => {
        try {
            const res = await productApi.getAllCategoriesForDropdown();
            setBulkCategories(res?.data || []);
        } catch (err) {
            toast.error("Failed to load categories for bulk assignment.");
        }
    };

    const handleRowClick = (productId: number) => {
        navigate(`/admin/products/${productId}`);
    };

    // --- FORM MODAL LOGIC ---
    const openCreateModal = () => {
        setIsEditMode(false);
        setCurrentProductId(null);
        setForm({ name: "", sku: "", price: "", category_id: "", description: "", is_available: true, preparation_time: "" });
        setErrors({});
        setShowModal(true);
    };

    const openEditModal = (e: React.MouseEvent, product: any) => {
        e.stopPropagation();
        setIsEditMode(true);
        setCurrentProductId(product.id);

        // Tìm ID của Category dựa trên Name để gán vào select box
        const cate = categories.find(c => c.name === product.categoryName);

        setForm({
            name: product.name,
            sku: product.sku,
            price: String(product.price),
            category_id: cate ? String(cate.id) : "",
            description: product.description || "",
            is_available: product.available,
            preparation_time: product.preparationTime ? String(product.preparationTime) : ""
        });
        setErrors({});
        setShowModal(true);
    };

    const openImageProduct = (e: React.MouseEvent, product: any) => {
        e.stopPropagation();
        setActiveProduct(product);    
    };

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setForm({ ...form, [name]: type === "checkbox" ? checked : value });
        if (errors[name]) {
            setErrors((prev: any) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const newErrors: any = {};
        if (!form.name.trim()) newErrors.name = "Name is required";
        if (!form.sku.trim()) newErrors.sku = "SKU is required";
        if (!form.price) newErrors.price = "Price is required";
        if (!form.category_id) newErrors.category_id = "Select a category";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const showSuccess = (msg: string) => {
        setSuccessPopup({ show: true, message: msg });
        setTimeout(() => setSuccessPopup({ show: false, message: "" }), 1500);
    };

    // --- SUBMIT LOGIC (CREATE & UPDATE) ---
    const handleSubmit = async () => {
        if (!validateForm()) return;
        try {
            const payload = {
                name: form.name,
                sku: form.sku,
                price: Number(form.price),
                categoryId: Number(form.category_id),
                description: form.description,
                available: form.is_available,
                preparationTime: form.preparation_time ? Number(form.preparation_time) : null
            };

            if (isEditMode && currentProductId) {
                await productApi.update(currentProductId, payload);
                showSuccess("Product Updated Successfully! 🔄");
            } else {
                await productApi.create(payload);
                showSuccess("Product Created Successfully! ✨");
            }

            setShowModal(false);
            fetchProducts();
        } catch (err: any) {
            const backendMessage = err.response?.data?.message;
            if (backendMessage === "SKU already exists") {
                setErrors((prev: any) => ({ ...prev, sku: "This SKU is already taken!" }));
            } else {
                toast.error("Action failed. Please try again.");
            }
        }
    };

    // --- DELETE LOGIC ---
    const openDeleteModal = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setDeleteId(id);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await productApi.delete(Number(deleteId));
            setShowDeleteModal(false);
            showSuccess("Product Deleted Successfully! 🗑️");
            fetchProducts();
            setDeleteId(null);
        } catch (err) {
            toast.error("Delete failed!");
        }
    };

    // --- INGREDIENT MANAGEMENT LOGIC ---
    const openIngredientModal = async (e: React.MouseEvent, product: any) => {
        e.stopPropagation();
        setCurrentProductId(product.id);
        setIngredientForm({ ingredient_id: "", quantity: "", unit: "", name: "" });
        setIngredientErrors({});

        try {
            // Fetch available ingredients and current product ingredients
            const [ingredientsRes, productIngredientsRes] = await Promise.all([
                productApi.getAllIngredients(),
                productApi.getIngredients(product.id)
            ]);

            setIngredients(ingredientsRes?.data || []);
            setProductIngredients(productIngredientsRes?.data?.ingredients || []);
        } catch (err) {
            toast.error("Failed to load ingredients data.");
        }

        setShowIngredientModal(true);
    };

    const handleIngredientChange = (e: any) => {
        const { name, value } = e.target;
        setIngredientForm({ ...ingredientForm, [name]: value });
        if (ingredientErrors[name]) {
            setIngredientErrors((prev: any) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validateIngredientForm = () => {
        const newErrors: any = {};
        if (!ingredientForm.ingredient_id) newErrors.ingredient_id = "Select an ingredient";
        if (!ingredientForm.quantity) newErrors.quantity = "Quantity is required";
        if (!ingredientForm.unit) newErrors.unit = "Unit is required";
        setIngredientErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAddIngredient = async () => {
        if (!validateIngredientForm() || !currentProductId) return;

        try {
            const payload = {
                ingredientId: Number(ingredientForm.ingredient_id),
                quantity: Number(ingredientForm.quantity),
                unit: ingredientForm.unit
            };

            await productApi.assignIngredients(currentProductId, [payload]);

            // Refresh product ingredients
            const productIngredientsRes = await productApi.getIngredients(currentProductId);
            setProductIngredients(productIngredientsRes?.data?.ingredients || []);

            // Reset form
            setIngredientForm({ ingredient_id: "", quantity: "", unit: "", name: "" });
        } catch {
            // Success/error toasts are shown by productApi.assignIngredients
        }
    };

    const handleUpdateIngredient = async (ingredientId: number, newQuantity: number) => {
        if (!currentProductId) return;

        try {
            await productApi.updateIngredient(currentProductId, ingredientId, newQuantity);

            // Refresh product ingredients
            const productIngredientsRes = await productApi.getIngredients(currentProductId);
            setProductIngredients(productIngredientsRes?.data?.ingredients || []);
        } catch {
            // Success/error toasts are shown by productApi.updateIngredient
        }
    };

    const handleRemoveIngredient = async (ingredientId: number) => {
        if (!currentProductId) return;

        try {
            await productApi.removeIngredient(currentProductId, ingredientId);

            // Refresh product ingredients
            const productIngredientsRes = await productApi.getIngredients(currentProductId);
            setProductIngredients(productIngredientsRes?.data?.ingredients || []);
        } catch {
            // Success/error toasts are shown by productApi.removeIngredient
        }
    };

    const calculateTotalCost = () => {
        return productIngredients.reduce((total, ingredient) => {
            return total + (ingredient.quantity * ingredient.costPerUnit);
        }, 0);
    };

    // --- TAG MANAGEMENT LOGIC ---
    const openTagModal = async (e: React.MouseEvent, product: any) => {
        e.stopPropagation();
        setCurrentProductId(product.id);
        setSelectedTags([]);

        try {
            // Fetch available tags and current product tags
            const [tagsRes, productTagsRes] = await Promise.all([
                productApi.getAllTags(),
                productApi.getProductTags(product.id)
            ]);

            setTags(tagsRes?.data || []);
            setProductTags(productTagsRes?.data || []);
            // Set selected tags from product's current tags
            setSelectedTags(productTagsRes?.data?.map((tag: any) => String(tag.id)) || []);
        } catch (err) {
            toast.error("Failed to load tags data.");
        }

        setShowTagModal(true);
    };

    const handleTagSelection = (tagId: string) => {
        // For checkboxes, multiple tags can be selected
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const handleAssignTags = async () => {
        if (!currentProductId) return;

        try {
            await productApi.assignTags(currentProductId, { tagIds: selectedTags });

            const productRes = await productApi.getById(currentProductId);
            setProductTags(productRes?.data?.tags || []);

            showSuccess("Tags assigned successfully! 🏷️");
            setShowTagModal(false);
        } catch (err) {
            toast.error("Failed to assign tags.");
        }
    };

    // --- BULK CATEGORY ASSIGNMENT LOGIC ---
    const handleProductSelection = (productId: number) => {
        setSelectedProducts(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const handleSelectAll = () => {
        if (selectedProducts.length === filteredProducts.length) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(filteredProducts.map(p => p.id));
        }
    };

    const handleBulkAssignCategory = async () => {
        if (!selectedCategory || selectedProducts.length === 0) {
            toast.error("Please select category and at least one product.");
            return;
        }

        try {
            await productApi.bulkAssignCategory({
                productIds: selectedProducts,
                categoryId: Number(selectedCategory)
            });

            // Refresh products
            fetchProducts();

            // Reset selection
            setSelectedProducts([]);
            setSelectedCategory("");

            showSuccess("Bulk category assignment successful! 📂");
        } catch (err) {
            toast.error("Failed to assign category to products.");
        }
    };

    const filteredProducts = products.filter((p) => {
        return (
            (!search || p.name.toLowerCase().includes(search.toLowerCase())) &&
            (!filterStatus || p.status === filterStatus) &&
            (!filterAvailable || String(p.available) === filterAvailable)
        );
    });

    return (
        <div className="product-page">
            <div className="product-header">
                <h2>📦 Product Management</h2>
                <button className="create-btn" onClick={openCreateModal}>
                    <i className="fas fa-plus"></i> Create Product
                </button>
            </div>

            {/* Bulk Category Assignment Section */}
            <div className="bulk-assignment-section" style={{
                background: '#fff',
                padding: '20px',
                borderRadius: '10px',
                marginBottom: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                        type="checkbox"
                        checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                        onChange={handleSelectAll}
                        style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: '500' }}>Select All ({selectedProducts.length} selected)</span>
                </div>

                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #ccc',
                        minWidth: '200px'
                    }}
                >
                    <option value="">Select Category</option>
                    {bulkCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>

                <button
                    onClick={handleBulkAssignCategory}
                    disabled={!selectedCategory || selectedProducts.length === 0}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        backgroundColor: selectedCategory && selectedProducts.length > 0 ? '#28a745' : '#6c757d',
                        color: 'white',
                        border: 'none',
                        cursor: selectedCategory && selectedProducts.length > 0 ? 'pointer' : 'not-allowed',
                        fontWeight: '500'
                    }}
                >
                    Assign Category to Selected
                </button>
            </div>

            <div className="product-filters">
                <input placeholder="Search product..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                </select>
                <select value={filterAvailable} onChange={(e) => setFilterAvailable(e.target.value)}>
                    <option value="">All Availability</option>
                    <option value="true">Available</option>
                    <option value="false">Off</option>
                </select>
            </div>

            <div className="product-table">
                <div className="table-header-row">
                    <span className="col-checkbox">
                        {/* <input
                            type="checkbox"
                            checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                            onChange={handleSelectAll}
                            style={{ width: '18px', height: '18px' }}
                        /> */}
                    </span>
                    <span className="col-info" style={{ marginRight: "-20px" }}>Product Info</span>
                    <span className="col-price" style={{ marginRight: "-20px" }}>Price</span>
                    <span className="col-price">Cate</span>
                    <span className="col-status"></span>
                    <span className="col-stock"></span>
                    <span className="col-actions">Actions</span>
                </div>

                {filteredProducts.map((p) => (
                    <div key={p.id} className="product-row" onClick={() => handleRowClick(p.id)}>
                        <div className="col-checkbox" onClick={(e) => e.stopPropagation()} style={{ marginRight: "20px" }}>
                            <input
                                type="checkbox"
                                checked={selectedProducts.includes(p.id)}
                                onChange={() => handleProductSelection(p.id)}
                                style={{ width: '18px', height: '18px' }}
                            />
                        </div>
                        <div className="col-info">
                            <h3>{p.name}</h3>
                            <div className="sub-info">
                                <span className="sku-tag">#{p.sku}</span>
                                <span className="cate-tag">{p.categoryName}</span>
                            </div>
                        </div>
                        <div className="col-price"><span className="price-text">{p.price.toLocaleString()} đ</span></div>
                        <div className="col-price"><span className="price-text">{p.categoryName}</span></div>
                        <div className="col-status"><span className={`status-pill ${p.status.toLowerCase()}`}>{p.status}</span></div>
                        <div className="col-stock">
                            <span className={`stock-badge ${p.available ? "is-on" : "is-off"}`}>
                                <i className={`fas fa-${p.available ? "check-circle" : "times-circle"}`}></i> {p.available ? "Available" : "Off"}
                            </span>
                        </div>
                        <div className="col-actions">
                            <button className="row-btn build" onClick={(e) => openIngredientModal(e, p)} title="Build Product">
                                <i className="fas fa-hammer"></i>
                            </button>
                            <button className="row-btn tag" onClick={(e) => openTagModal(e, p)} title="Assign Tags">
                                <i className="fas fa-tags"></i>
                            </button>
                            <button className="row-btn edit" onClick={(e) => openEditModal(e, p)}><i className="fas fa-pen"></i></button>
                            <button className="row-btn delete" onClick={(e) => openDeleteModal(e, p.id)}><i className="fas fa-trash"></i></button>
                            <button className="row-btn delete" onClick={(e) => openImageProduct(e, p)}><i className="fas fa-image"></i></button>
                        </div>
                    </div>
                ))}
                {filteredProducts.length === 0 && <div className="empty-state">No products found. ☕</div>}
            </div>

            {activeProduct && (
                <div className="admin-card" style={{ padding: "20px" }}>
                    <ProductImageManager
                        product={activeProduct}
                        onClose={() => setActiveProduct(null)}
                    />
                </div>
            )}

            {/* FORM MODAL (CREATE & UPDATE) */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{isEditMode ? "🔄 Update Product" : "✨ New Product"}</h3>
                            <button className="close-modal" onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className={`input-group ${errors.name ? "has-error" : ""}`}>
                                <label>Product Name *</label>
                                {errors.name && <span className="error-text-top">{errors.name}</span>}
                                <input name="name" placeholder="Enter product name" onChange={handleChange} value={form.name} />
                            </div>
                            <div className="input-row">
                                <div className={`input-group ${errors.sku ? "has-error" : ""}`}>
                                    <label>SKU *</label>
                                    {errors.sku && <span className="error-text-top">{errors.sku}</span>}
                                    <input name="sku" placeholder="SKU-123" onChange={handleChange} value={form.sku} />
                                </div>
                                <div className={`input-group ${errors.price ? "has-error" : ""}`}>
                                    <label>Price (VNĐ) *</label>
                                    {errors.price && <span className="error-text-top">{errors.price}</span>}
                                    <input name="price" type="number" placeholder="0.00" onChange={handleChange} value={form.price} />
                                </div>
                            </div>
                            <div className={`input-group ${errors.category_id ? "has-error" : ""}`}>
                                <label>Category *</label>
                                {errors.category_id && <span className="error-text-top">{errors.category_id}</span>}
                                <select name="category_id" onChange={handleChange} value={form.category_id}>
                                    <option value="">Select Category</option>
                                    {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Description</label>
                                <textarea name="description" placeholder="A brief description..." onChange={handleChange} value={form.description} />
                            </div>
                            <div className="input-group">
                                <label>Prep Time (min)</label>
                                <input name="preparation_time" type="number" placeholder="15" onChange={handleChange} value={form.preparation_time} />
                            </div>
                            <label className="checkbox-container">
                                <input type="checkbox" name="is_available" checked={form.is_available} onChange={handleChange} />
                                <span className="checkmark"></span> Available for sale
                            </label>
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => setShowModal(false)} className="cancel-btn">Discard</button>
                            <button onClick={handleSubmit} className="save-btn">
                                {isEditMode ? "Save Changes" : "Create Product"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM DELETE MODAL */}
            {showDeleteModal && (
                <div className="modal-overlay delete-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="confirm-icon"><i className="fas fa-exclamation-triangle"></i></div>
                        <h3>Are you sure?</h3>
                        <p>This action cannot be undone.</p>
                        <div className="confirm-actions">
                            <button className="cancel-confirm-btn" onClick={() => setShowDeleteModal(false)}>No, Cancel</button>
                            <button className="delete-confirm-btn" onClick={handleDelete}>Yes, Delete it!</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SUCCESS POPUP */}
            {successPopup.show && (
                <div className="modal-overlay success-overlay">
                    <div className="success-popup">
                        <div className="success-icon-circle"><i className="fas fa-check"></i></div>
                        <h4>{successPopup.message}</h4>
                        <div className="success-progress-bar"></div>
                    </div>
                </div>
            )}

            {/* INGREDIENT MANAGEMENT MODAL */}
            {showIngredientModal && (
                <div className="modal-overlay" onClick={() => setShowIngredientModal(false)}>
                    <div className="modal ingredient-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3> Build Product - Manage Ingredients</h3>
                            <button className="close-modal" onClick={() => setShowIngredientModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            {/* Add Ingredient Form */}
                            <div className="ingredient-form-section">
                                <h4>Add Ingredient</h4>
                                <div className="input-row">
                                    <div className={`input-group ${ingredientErrors.ingredient_id ? "has-error" : ""}`}>
                                        <label>Ingredient *</label>
                                        {ingredientErrors.ingredient_id && <span className="error-text-top">{ingredientErrors.ingredient_id}</span>}
                                        <select name="ingredient_id" onChange={handleIngredientChange} value={ingredientForm.ingredient_id}>
                                            <option value="">Select Ingredient</option>
                                            {ingredients.map((ing) => (
                                                <option key={ing.id} value={ing.id}>
                                                    {ing.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={`input-group ${ingredientErrors.quantity ? "has-error" : ""}`}>
                                        <label>Quantity *</label>
                                        {ingredientErrors.quantity && <span className="error-text-top">{ingredientErrors.quantity}</span>}
                                        <input name="quantity" type="number" placeholder="50" onChange={handleIngredientChange} value={ingredientForm.quantity} />
                                    </div>
                                    <div className={`input-group ${ingredientErrors.unit ? "has-error" : ""}`}>
                                        <label>Unit *</label>
                                        {ingredientErrors.unit && <span className="error-text-top">{ingredientErrors.unit}</span>}
                                        <select name="unit" onChange={handleIngredientChange} value={ingredientForm.unit}>
                                            <option value="">Select Unit</option>
                                            <option value="g">g</option>
                                            <option value="kg">kg</option>
                                            <option value="ml">ml</option>
                                            <option value="l">l</option>
                                            <option value="pcs">pcs</option>
                                            <option value="tbsp">tbsp</option>
                                            <option value="tsp">tsp</option>
                                        </select>
                                    </div>
                                </div>
                                <button className="add-ingredient-btn" style={{ padding: "10px", marginBottom: "20px", borderRadius: "10px", backgroundColor: "green", color: "white" }} onClick={handleAddIngredient}>
                                    <i className="fas fa-plus"></i> Add Ingredient
                                </button>
                            </div>

                            {/* Current Ingredients List */}
                            <div className="ingredients-list-section">
                                <h4>Current Ingredients</h4>
                                <div className="ingredients-cost-display">
                                    <strong>Total Cost: {calculateTotalCost().toLocaleString()} đ</strong>
                                </div>
                                {productIngredients.length === 0 ? (
                                    <div className="empty-ingredients">No ingredients added yet.</div>
                                ) : (
                                    <div style={{ padding: "16px", background: "#fff", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr style={{ background: "#f5f6fa", textAlign: "left" }}>
                                                    <th style={{ padding: "10px", fontWeight: 600, fontSize: "14px" }}>STT</th>
                                                    <th style={{ padding: "10px", fontWeight: 600, fontSize: "14px" }}>Ingredient Name</th>
                                                    <th style={{ padding: "10px", fontWeight: 600, fontSize: "14px" }}>Quantity</th>
                                                    <th style={{ padding: "10px", fontWeight: 600, fontSize: "14px" }}>Unit Cost</th>
                                                    <th style={{ padding: "10px", fontWeight: 600, fontSize: "14px" }}>Total Cost</th>
                                                    <th style={{ padding: "10px", fontWeight: 600, fontSize: "14px" }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {productIngredients.map((pi, index) => (
                                                    <tr
                                                        key={pi.ingredientId}
                                                        style={{ borderBottom: "1px solid #eee" }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                                                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                                    >
                                                        <td style={{ padding: "10px", fontSize: "14px" }}>{index + 1}</td>

                                                        <td style={{ padding: "10px", fontSize: "14px" }}>
                                                            <strong>{pi.ingredientName}</strong>
                                                        </td>

                                                        <td style={{ padding: "10px", fontSize: "14px" }}>
                                                            <input
                                                                type="number"
                                                                value={pi.quantity}
                                                                min="1"
                                                                onChange={(e) =>
                                                                    handleUpdateIngredient(pi.ingredientId, Number(e.target.value))
                                                                }
                                                                style={{
                                                                    width: "70px",
                                                                    padding: "6px",
                                                                    borderRadius: "6px",
                                                                    border: "1px solid #ccc",
                                                                    textAlign: "center",
                                                                    outline: "none"
                                                                }}
                                                            />
                                                        </td>

                                                        <td style={{ padding: "10px", fontSize: "14px" }}>
                                                            {pi.costPerUnit.toLocaleString()} đ/{pi.unit}
                                                        </td>

                                                        <td style={{ padding: "10px", fontSize: "14px", fontWeight: "bold", color: "#2ecc71" }}>
                                                            {(pi.quantity * pi.costPerUnit).toLocaleString()} đ
                                                        </td>

                                                        <td style={{ padding: "10px", fontSize: "14px" }}>
                                                            <button
                                                                onClick={() => handleRemoveIngredient(pi.ingredientId)}
                                                                style={{
                                                                    padding: "6px 10px",
                                                                    border: "none",
                                                                    borderRadius: "6px",
                                                                    background: "#e74c3c",
                                                                    color: "#fff",
                                                                    cursor: "pointer"
                                                                }}
                                                            >
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => setShowIngredientModal(false)} className="cancel-btn">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAG ASSIGNMENT MODAL */}
            {showTagModal && (
                <div className="modal-overlay" onClick={() => setShowTagModal(false)} style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
                        background: 'white',
                        borderRadius: '12px',
                        width: '90%',
                        maxWidth: '600px',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)'
                    }}>
                        <div className="modal-header" style={{ padding: "20px" }}>
                            <h3>Assign Tags</h3>
                            <button className="close-btn" onClick={() => setShowTagModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="tag-selection-section">
                                <div className="tags-grid">
                                    {tags.map((tag) => (
                                        <label key={tag.id} className="tag-checkbox-label">
                                            <input
                                                type="checkbox"
                                                value={tag.id}
                                                checked={selectedTags.includes(String(tag.id))}
                                                onChange={() => handleTagSelection(String(tag.id))}
                                            />
                                            <span className="tag-checkbox-text">{tag.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions" style={{ marginBottom: "20px", padding: "0 20px" }}>
                            <button onClick={handleAssignTags} style={{ padding: "10px", backgroundColor: "green", borderRadius: "10px", color: "white" }}>Assign Tags</button>
                            <button onClick={() => setShowTagModal(false)} style={{ padding: "10px 20px", backgroundColor: "red", borderRadius: "10px", color: "white" }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductPage;

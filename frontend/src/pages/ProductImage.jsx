import React, { useState } from "react";
import ProductImageManager from "../components/ProductImageManager";
import { productApi } from "../services/api";
import { toast } from "react-toastify";

const ProductImage = () => {
  const [searchInput, setSearchInput] = useState("");
  const [activeProduct, setActiveProduct] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setLoading(true);
    setSearchResults([]);
    setActiveProduct(null);

    let foundProducts = [];

    try {
      // Search by Name, SKU, or Description
      const resSearch = await productApi.getProducts({ search: searchInput.trim(), limit: 5 });
      if (resSearch.data?.data?.data) { // FIX: The Java PageResponse returns an array called 'data', not 'content'
        const idSet = new Set(foundProducts.map(p => p.id));
        resSearch.data.data.data.forEach(p => {
          if (!idSet.has(p.id)) {
            foundProducts.push(p);
            idSet.add(p.id);
          }
        });
      }

      if (foundProducts.length === 0) {
        toast.info("No products found matching your search.");
      } else if (foundProducts.length === 1) {
        // Auto-select if only one match
        setActiveProduct(foundProducts[0]);
      } else {
        // Show list for user to choose
        setSearchResults(foundProducts);
      }
    } catch (err) {
      toast.error("Error searching for products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header admin-header-enhanced">
        <div>
          <span className="admin-header-eyebrow">Inventory</span>
          <h1>Product Image Management</h1>
        </div>
      </div>

      <div className="admin-card mb-4" style={{ padding: "20px", maxWidth: "600px" }}>
        <form onSubmit={handleSearch}>
          <div className="admin-form-group mb-0">
            <label className="admin-label">Search Product by SKU or Name</label>
            <div className="d-flex gap-2">
              <input 
                type="text" 
                className="admin-input flex-grow-1" 
                placeholder="e.g. CFSD-001 or Cà phê đen"
                required
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit" className="admin-primary-btn" disabled={loading}>
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>} Search
              </button>
            </div>
          </div>
        </form>

        {searchResults.length > 1 && !activeProduct && (
          <div className="mt-4">
            <p className="text-muted mb-2">Multiple products found. Please select one:</p>
            <ul className="list-group">
              {searchResults.map(p => (
                <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{p.name}</strong> <span className="text-muted ms-2">(SKU: {p.sku})</span>
                  </div>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => setActiveProduct(p)}>
                    Select
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {activeProduct && (
        <div className="admin-card" style={{ padding: "20px" }}>
          <ProductImageManager
            product={activeProduct}
            onClose={() => setActiveProduct(null)}
          />
        </div>
      )}
    </div>
  );
};

export default ProductImage;

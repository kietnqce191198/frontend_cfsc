import React, { useState, useRef } from "react";
import { productApi } from "../services/api";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

const ProductImageManager = ({ product, onClose }) => {
  const [images, setImages] = useState(product.images || []);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const bulkInputRef = useRef(null);

  const fetchImages = async () => {
    try {
      const res = await productApi.getProduct(product.id);
      setImages(res.data.data.images || []);
    } catch (err) {
      toast.error("Failed to refresh images");
    }
  };

  const validateFile = (file) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`File ${file.name} exceeds 5MB limit`);
      return false;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error(`Unsupported format for ${file.name}`);
      return false;
    }
    return true;
  };

  const handleSingleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !validateFile(file)) return;
    if (images.length >= 10) {
      toast.error("Maximum 10 images allowed per product");
      return;
    }

    try {
      setLoading(true);
      await productApi.uploadImage(product.id, file);
      toast.success("Image uploaded!");
      fetchImages();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const handleBulkUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (images.length + files.length > 10) {
      toast.error(`Cannot upload. Maximum 10 images allowed. You can only add ${10 - images.length} more.`);
      return;
    }

    const validFiles = files.filter(validateFile);
    if (validFiles.length === 0) return;

    try {
      setLoading(true);
      await productApi.uploadImagesBulk(product.id, validFiles);
      toast.success("Images uploaded successfully!");
      fetchImages();
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk upload failed");
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const handleDelete = async (imageId) => {
    if (images.length === 1 && product.available) {
      toast.error("Cannot delete the last image of an available product.");
      return;
    }

    const result = await Swal.fire({
      title: "Delete Image?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        await productApi.deleteImage(product.id, imageId);
        toast.success("Image deleted");
        fetchImages();
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to delete");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSetPrimary = async (imageId) => {
    try {
      setLoading(true);
      await productApi.setPrimaryImage(product.id, imageId);
      toast.success("Primary image updated");
      fetchImages();
    } catch (err) {
      toast.error("Failed to set primary image");
    } finally {
      setLoading(false);
    }
  };

  const moveImage = async (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === images.length - 1)) return;
    
    const newImages = [...images];
    const temp = newImages[index];
    newImages[index] = newImages[index + direction];
    newImages[index + direction] = temp;

    // Build reorder request
    const reorderData = newImages.map((img, i) => ({
      imageId: img.id,
      displayOrder: i + 1
    }));

    try {
      setLoading(true);
      await productApi.reorderImages(product.id, reorderData);
      setImages(newImages);
      toast.success("Order updated");
    } catch (err) {
      toast.error("Failed to reorder");
      fetchImages(); // Revert on failure
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal" style={{ width: "800px", maxWidth: "90vw" }}>
        <div className="admin-modal-header">
          <h2>Manage Images - {product.name}</h2>
          <button className="icon-btn" onClick={onClose} disabled={loading}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="admin-modal-body">
          <div className="d-flex gap-3 mb-4">
            <button className="admin-primary-btn" onClick={() => fileInputRef.current.click()} disabled={loading}>
              <i className="fas fa-upload me-2"></i> Single Upload
            </button>
            <input type="file" ref={fileInputRef} hidden accept="image/jpeg, image/png, image/webp" onChange={handleSingleUpload} />
            
            <button className="admin-secondary-btn" onClick={() => bulkInputRef.current.click()} disabled={loading}>
              <i className="fas fa-images me-2"></i> Bulk Upload
            </button>
            <input type="file" ref={bulkInputRef} hidden multiple accept="image/jpeg, image/png, image/webp" onChange={handleBulkUpload} />
          </div>

          {loading ? (
            <div className="text-center py-5">
              <i className="fas fa-spinner fa-spin fa-3x text-primary"></i>
              <p className="mt-2 text-muted">Processing...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-camera fa-4x mb-3 text-light"></i>
              <h5>No images uploaded yet</h5>
              <p>Upload maximum 10 images (JPEG, PNG, WebP) under 5MB.</p>
            </div>
          ) : (
            <div className="row g-3">
              {images.map((img, index) => (
                <div key={img.id} className="col-12 col-md-6 col-lg-4">
                  <div className={`card h-100 ${img.primary ? 'border-primary shadow-sm' : ''}`}>
                    <div className="position-relative">
                      <img src={img.thumbnailUrl || img.imageUrl} className="card-img-top" alt="Product" 
                           style={{ height: "200px", objectFit: "cover" }} />
                      {img.primary && (
                        <span className="badge bg-primary position-absolute top-0 start-0 m-2">Primary</span>
                      )}
                    </div>
                    <div className="card-body p-2 text-center">
                      <div className="btn-group w-100 mb-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => moveImage(index, -1)} disabled={index === 0}>
                          <i className="fas fa-arrow-left"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1}>
                          <i className="fas fa-arrow-right"></i>
                        </button>
                      </div>
                      <div className="d-flex gap-2 justify-content-center">
                        {!img.primary && (
                          <button className="btn btn-sm btn-outline-primary w-50" onClick={() => handleSetPrimary(img.id)}>
                            Set Primary
                          </button>
                        )}
                        <button className={`btn btn-sm btn-outline-danger ${img.primary ? 'w-100' : 'w-50'}`} onClick={() => handleDelete(img.id)}>
                          <i className="fas fa-trash"></i> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductImageManager;

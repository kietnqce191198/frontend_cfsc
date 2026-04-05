import React, { useState, useRef, useEffect } from "react";
import { productApi } from "../services/api";
import { toast } from "react-toastify";

const ProductImageManager = ({ product, onClose }) => {
  const [images, setImages] = useState(product.images || []);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  
  const fileInputRef = useRef(null);
  const bulkInputRef = useRef(null);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const res = await productApi.getProduct(product.id);
      setImages(res.data.data.images || []);
    } catch (err) {
      toast.error("Failed to refresh images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [product.id]);

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
      toast.error(`Limit exceeded. You can only add ${10 - images.length} more.`);
      return;
    }

    const validFiles = files.filter(validateFile);
    if (validFiles.length === 0) return;

    try {
      setLoading(true);
      await productApi.uploadImagesBulk(product.id, validFiles);
      toast.success("Bulk upload successful!");
      fetchImages();
    } catch (err) {
      toast.error("Bulk upload failed");
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const executeDelete = async (imageId) => {
    if (images.length === 1 && product.available) {
      toast.error("Cannot delete the last image of an available product.");
      setDeletingId(null);
      return;
    }

    try {
      setLoading(true);
      await productApi.deleteImage(product.id, imageId);
      toast.success("Image removed");
      setDeletingId(null);
      fetchImages();
    } catch (err) {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (imageId) => {
    try {
      setLoading(true);
      await productApi.setPrimaryImage(product.id, imageId);
      toast.success("Primary image set");
      fetchImages();
    } catch (err) {
      toast.error("Failed to update primary image");
    } finally {
      setLoading(false);
    }
  };

  const moveImage = async (index, direction) => {
    const newImages = [...images];
    const temp = newImages[index];
    newImages[index] = newImages[index + direction];
    newImages[index + direction] = temp;

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
      fetchImages();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal image-manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🖼️ Manage Images - {product.name}</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="upload-actions">
            <button className="save-btn" onClick={() => fileInputRef.current.click()} disabled={loading}>
              <i className="fas fa-upload"></i> Single Upload
            </button>
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleSingleUpload} />

            <button className="cancel-btn bulk-up-btn" onClick={() => bulkInputRef.current.click()} disabled={loading}>
              <i className="fas fa-images"></i> Bulk Upload
            </button>
            <input type="file" ref={bulkInputRef} hidden multiple accept="image/*" onChange={handleBulkUpload} />
          </div>

          {loading && !deletingId && (
            <div className="image-loading-state">
              <div className="loader-spinner"></div>
              <p>Processing...</p>
            </div>
          )}

          {!loading && images.length === 0 && (
            <div className="empty-state">
              <i className="fas fa-camera fa-3x"></i>
              <p>No images yet. Upload some!</p>
            </div>
          )}

          <div className="image-grid">
            {images.map((img, index) => (
              <div key={img.id} className={`image-card ${img.primary ? 'is-primary' : ''} ${deletingId === img.id ? 'is-deleting' : ''}`}>
                <div className="image-wrapper">
                  <img src={img.thumbnailUrl || img.imageUrl} alt="Product" />
                  {img.primary && <span className="primary-tag">Primary</span>}
                  
                  {/* Local Delete Confirmation */}
                  {deletingId === img.id ? (
                    <div className="delete-confirm-overlay">
                      <p>Delete this?</p>
                      <div className="confirm-btns">
                        <button className="check-btn" onClick={() => executeDelete(img.id)}><i className="fas fa-check"></i></button>
                        <button className="x-btn" onClick={() => setDeletingId(null)}><i className="fas fa-times"></i></button>
                      </div>
                    </div>
                  ) : (
                    <div className="reorder-overlay">
                      <button onClick={() => moveImage(index, -1)} disabled={index === 0}>
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      <button onClick={() => moveImage(index, 1)} disabled={index === images.length - 1}>
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  )}
                </div>

                <div className="image-card-actions">
                  {!img.primary && !deletingId && (
                    <button className="set-primary-btn" onClick={() => handleSetPrimary(img.id)}>Set Main</button>
                  )}
                  {!deletingId && (
                    <button className={`delete-img-btn ${img.primary ? 'w-100' : ''}`} onClick={() => setDeletingId(img.id)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="modal-actions">
          <p className="upload-note">Max 10 images • JPG/PNG/WebP • Under 5MB</p>
          <button onClick={onClose} className="cancel-btn">Close</button>
        </div>
      </div>
    </div>
  );
};

export default ProductImageManager;
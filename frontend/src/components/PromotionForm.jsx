import React, { useState, useEffect } from "react";

function PromotionForm({ initialData, onSave, onCancel, isViewOnly = false, onStatusChange }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "PERCENTAGE_DISCOUNT",
    value: 0,
    startDate: "",
    endDate: "",
    featured: false,
    minOrderAmount: 0,
    minQuantity: 1,
    maxDiscountAmount: 0,
    maxUsesTotal: 100,
    maxUsesPerCustomer: 1,
    applicableProducts: "",
    applicableCategories: "",
    targetSegmentIds: "" // Khôi phục lại trường này từ Request
  });

  const [errors, setErrors] = useState({});

  const disableAll = isViewOnly;
  const disableMost = initialData?.status === "ACTIVE" ||
   initialData?.status === "SCHEDULED" ||
   isViewOnly;

useEffect(() => {
  if (initialData) {
    setFormData({
      ...initialData,
      featured: initialData.isFeatured ?? initialData.featured ?? false,

      startDate: initialData.startDate ? initialData.startDate.slice(0, 16) : "",
      endDate: initialData.endDate ? initialData.endDate.slice(0, 16) : "",

      minOrderAmount: initialData.minOrderAmount ?? 0,
      minQuantity: initialData.minQuantity ?? 1,
      maxDiscountAmount: initialData.maxDiscountAmount ?? 0,
      maxUsesTotal: initialData.maxUsesTotal ?? 1,
      maxUsesPerCustomer: initialData.maxUsesPerCustomer ?? 1,

      applicableProducts: initialData.applicableProducts ?? "",
      applicableCategories: initialData.applicableCategories ?? "",
      targetSegmentIds: initialData.targetSegmentIds ?? ""
    });
  }
}, [initialData]);

  const validate = () => {
      const newErrors = {};

      // Basic Info
      if (!formData.name.trim()) newErrors.name = "Promotion name is required";
      if (formData.value <= 0) newErrors.value = "Discount value must be positive";
      if (!formData.startDate) newErrors.startDate = "Start date is required";
      if (!formData.endDate) newErrors.endDate = "End date is required";

      // Date Logic
      if (formData.startDate && formData.endDate) {
        if (new Date(formData.endDate) <= new Date(formData.startDate)) {
          newErrors.endDate = "End date must be after start date";
        }
      }

      if (formData.minOrderAmount < 0) {
        newErrors.minOrderAmount = "Cannot be negative";
      }
      if (formData.minQuantity < 1) {
        newErrors.minQuantity = "Must be at least 1";
      }
      if (formData.maxDiscountAmount < 0) {
        newErrors.maxDiscountAmount = "Cannot be negative";
      }

      // Limitations
      if (formData.maxUsesTotal < 1) {
        newErrors.maxUsesTotal = "Must be at least 1";
      }
      if (formData.maxUsesPerCustomer < 1) {
        newErrors.maxUsesPerCustomer = "Must be at least 1";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

  const handleChange = (e) => {
    if (isViewOnly) return;
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const handleToggleStatus = () => {
    if (!initialData || !onStatusChange) return;
    const isRunningOrScheduled = initialData.status === "ACTIVE" || initialData.status === "SCHEDULED";
    const newStatus = isRunningOrScheduled ? "INACTIVE" : "ACTIVE";
    onStatusChange(initialData.id, newStatus);
  };
const isStatusActiveOrScheduled = initialData?.status === "ACTIVE" || initialData?.status === "SCHEDULED";
  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded border shadow-sm">
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
        <h4 className="text-primary m-0">
          {isViewOnly ? "Promotion Details" : initialData ? "Update Promotion" : "Create Promotion"}
        </h4>

        {initialData && isViewOnly && initialData.status !== "SCHEDULED" && (
          <div className="d-flex align-items-center gap-2">
            <span className="fw-bold small text-muted">Status:</span>
            <span className={`badge ${initialData.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
              {initialData.status}
            </span>
            <button
              type="button"
              className={`btn btn-sm ${initialData.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'}`}
              onClick={handleToggleStatus}
            >
              {initialData.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </button>
          </div>
        )}
      </div>

      <div className="row">
        {/* Name */}
        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Name {errors.name && <span className="text-danger small ms-1">({errors.name})</span>}
          </label>
          <input type="text" className={`form-control ${errors.name ? 'is-invalid' : ''}`} name="name" value={formData.name} onChange={handleChange} disabled={disableMost} />
        </div>

        {/* Type */}
        <div className="col-md-3 mb-3">
          <label className="form-label fw-bold">Type</label>
          <select className="form-select" name="type" value={formData.type} onChange={handleChange} disabled={disableMost}>
            <option value="PERCENTAGE_DISCOUNT">Percentage</option>
            <option value="FIXED_DISCOUNT">Fixed Amount</option>
            <option value="FREE_SHIPPING">Free Shipping</option>
            <option value="BUY_X_GET_Y">Buy X Get Y</option>
            <option value="BUNDLE">Bundle</option>
          </select>
        </div>

        {/* Value */}
        <div className="col-md-3 mb-3">
          <label className="form-label fw-bold">
            Value {errors.value && <span className="text-danger small ms-1">({errors.value})</span>}
          </label>
          <input type="number" className={`form-control ${errors.value ? 'is-invalid' : ''}`} name="value" value={formData.value} onChange={handleChange} disabled={disableMost} />
        </div>

        {/* Dates */}
        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Start Date {errors.startDate && <span className="text-danger small ms-1">({errors.startDate})</span>}
          </label>
          <input type="datetime-local" className={`form-control ${errors.startDate ? 'is-invalid' : ''}`} name="startDate" value={formData.startDate} onChange={handleChange} disabled={disableMost} />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            End Date {errors.endDate && <span className="text-danger small ms-1">({errors.endDate})</span>}
          </label>
          <input type="datetime-local" className={`form-control ${errors.endDate ? 'is-invalid' : ''}`} name="endDate" value={formData.endDate} onChange={handleChange} disabled={disableAll} />
        </div>

        {/* Rules */}
        <div className="col-md-4 mb-3">
          <label className="form-label fw-bold small">
            Applicable Product IDs {errors.applicableProducts && <span className="text-danger small ms-1">({errors.applicableProducts})</span>}
          </label>
          <input type="text" className={`form-control ${errors.applicableProducts ? 'is-invalid' : ''}`} name="applicableProducts" value={formData.applicableProducts} onChange={handleChange} disabled={disableMost} placeholder="e.g. 1, 2, 3" />
        </div>

        <div className="col-md-4 mb-3">
          <label className="form-label fw-bold small">
            Applicable Category IDs {errors.applicableCategories && <span className="text-danger small ms-1">({errors.applicableCategories})</span>}
          </label>
          <input type="text" className={`form-control ${errors.applicableCategories ? 'is-invalid' : ''}`} name="applicableCategories" value={formData.applicableCategories} onChange={handleChange} disabled={disableMost} placeholder="e.g. 10, 11" />
        </div>

        {/* Amounts & Quantities */}
        <div className="col-md-3 mb-3">
          <label className="form-label fw-bold small">
            Min Order Amount {errors.minOrderAmount && <span className="text-danger small ms-1">({errors.minOrderAmount})</span>}
          </label>
          <input type="number" className={`form-control ${errors.minOrderAmount ? 'is-invalid' : ''}`} name="minOrderAmount" value={formData.minOrderAmount} onChange={handleChange} disabled={disableMost} />
        </div>

        <div className="col-md-3 mb-3">
          <label className="form-label fw-bold small">
            Min Quantity {errors.minQuantity && <span className="text-danger small ms-1">({errors.minQuantity})</span>}
          </label>
          <input type="number" className={`form-control ${errors.minQuantity ? 'is-invalid' : ''}`} name="minQuantity" value={formData.minQuantity} onChange={handleChange} disabled={disableMost} />
        </div>

        <div className="col-md-3 mb-3">
          <label className="form-label fw-bold small">
            Max Discount Amount {errors.maxDiscountAmount && <span className="text-danger small ms-1">({errors.maxDiscountAmount})</span>}
          </label>
          <input type="number" className={`form-control ${errors.maxDiscountAmount ? 'is-invalid' : ''}`} name="maxDiscountAmount" value={formData.maxDiscountAmount} onChange={handleChange} disabled={disableMost} />
        </div>

        {/* Limits */}
        <div className="col-md-3 mb-3">
          <label className="form-label fw-bold small">
            Total Uses Limit {errors.maxUsesTotal && <span className="text-danger small ms-1">({errors.maxUsesTotal})</span>}
          </label>
          <input type="number" className={`form-control ${errors.maxUsesTotal ? 'is-invalid' : ''}`} name="maxUsesTotal" value={formData.maxUsesTotal} onChange={handleChange} disabled={disableMost} />
        </div>

        <div className="col-md-3 mb-3">
          <label className="form-label fw-bold small">
            Uses Per Customer {errors.maxUsesPerCustomer && <span className="text-danger small ms-1">({errors.maxUsesPerCustomer})</span>}
          </label>
          <input type="number" className={`form-control ${errors.maxUsesPerCustomer ? 'is-invalid' : ''}`} name="maxUsesPerCustomer" value={formData.maxUsesPerCustomer} onChange={handleChange} disabled={disableMost} />
        </div>

        <div className="col-md-12 mb-3">
          <label className="form-label fw-bold">Description</label>
          <textarea className="form-control" name="description" value={formData.description} onChange={handleChange} rows="2" disabled={disableMost}></textarea>
        </div>

        <div className="col-md-12">
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" name="featured" id="feat" checked={formData.featured} onChange={handleChange} disabled={disableMost} />
            <label className="form-check-label fw-bold" htmlFor="feat">Featured Promotion</label>
          </div>
        </div>
      </div>

      <div className="d-flex gap-2 mt-4 justify-content-end border-top pt-3">
        <button type="button" className="btn btn-secondary px-4" onClick={onCancel}>
          {isViewOnly ? "Close" : "Cancel"}
        </button>
        {!isViewOnly && (
          <button
            type="submit"
            className={`btn px-5 ${initialData ? "btn-primary" : "btn-success"}`}
          >
            {initialData ? "Save Changes" : "Create Promotion"}
          </button>
        )}
      </div>
    </form>
  );
}

export default PromotionForm;
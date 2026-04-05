import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { categoryApi } from "../services/api";
import "../assets/category-admin.css";

const CATEGORY_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const CATEGORY_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const createInitialFormState = () => ({
  name: "",
  slug: "",
  description: "",
  image_url: "",
  image_file: null,
  parent_id: "",
  display_order: "0",
  active: true,
});

const appendMultipartField = (formData, name, value) => {
  if (value === undefined || value === null) {
    return;
  }

  formData.append(name, String(value));
};

const flattenCategories = (categories, depth = 0, parent = null) =>
  categories.flatMap((category) => {
    const item = {
      ...category,
      depth,
      parent_name: parent?.name || null,
      child_count: category.subcategories?.length || 0,
    };

    return [item, ...flattenCategories(category.subcategories || [], depth + 1, category)];
  });

const findCategoryById = (categories, id) => {
  for (const category of categories) {
    if (category.id === id) {
      return category;
    }

    const childMatch = findCategoryById(category.subcategories || [], id);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
};

const collectDescendantIds = (category) => {
  if (!category) {
    return new Set();
  }

  return new Set(
    (category.subcategories || []).flatMap((child) => [
      child.id,
      ...collectDescendantIds(child),
    ])
  );
};

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

function CategoryPage() {
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [structureFilter, setStructureFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("create");
  const [editorTarget, setEditorTarget] = useState(null);
  const [formState, setFormState] = useState(createInitialFormState());
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageInputKey, setImageInputKey] = useState(0);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const flatCategories = useMemo(
    () => flattenCategories(categories),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return flatCategories.filter((category) => {
      const matchesStructure =
        structureFilter === "all" ||
        (structureFilter === "roots" && category.depth === 0) ||
        (structureFilter === "children" && category.depth > 0);

      const haystack = [
        category.name,
        category.slug,
        category.description,
        category.parent_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || haystack.includes(normalizedSearch);

      return matchesStructure && matchesSearch;
    });
  }, [flatCategories, searchTerm, structureFilter]);

  const selectedCategorySummary = useMemo(
    () => flatCategories.find((category) => category.id === selectedCategoryId) || null,
    [flatCategories, selectedCategoryId]
  );

  const categoryStats = useMemo(() => {
    const total = flatCategories.length;
    const roots = flatCategories.filter((category) => category.depth === 0).length;
    const active = flatCategories.filter((category) => category.active).length;
    const withProducts = flatCategories.filter(
      (category) => Number(category.product_count || 0) > 0
    ).length;

    return { total, roots, active, withProducts };
  }, [flatCategories]);

  const parentOptions = useMemo(() => {
    if (!flatCategories.length) {
      return [];
    }

    if (editorMode !== "update" || !editorTarget) {
      return flatCategories;
    }

    const editorNode = findCategoryById(categories, editorTarget.id);
    const blockedIds = collectDescendantIds(editorNode);
    blockedIds.add(editorTarget.id);

    return flatCategories.filter((category) => !blockedIds.has(category.id));
  }, [categories, editorMode, editorTarget, flatCategories]);

  const canChooseRootParent =
    editorMode === "create" || !editorTarget || editorTarget.parent_id == null;

  const loadCategories = async (preferredId = null) => {
    setIsLoading(true);

    try {
      const params = {};
      if (statusFilter === "active") {
        params.is_active = true;
      } else if (statusFilter === "inactive") {
        params.is_active = false;
      }

      const response = await categoryApi.getAll(params);
      const nextCategories = response.data || [];
      const nextFlat = flattenCategories(nextCategories);
      const currentId = preferredId ?? selectedCategoryId;
      const nextSelected =
        (currentId && nextFlat.some((category) => category.id === currentId) && currentId) ||
        nextFlat[0]?.id ||
        null;

      setCategories(nextCategories);
      setSelectedCategoryId(nextSelected);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load categories."));
      setCategories([]);
      setSelectedCategoryId(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [statusFilter]);

  useEffect(() => {
    if (!filteredCategories.length) {
      setSelectedCategoryId(null);
      return;
    }

    if (
      selectedCategoryId == null ||
      !filteredCategories.some((category) => category.id === selectedCategoryId)
    ) {
      setSelectedCategoryId(filteredCategories[0].id);
    }
  }, [filteredCategories, selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategoryId) {
      setSelectedCategory(null);
      return;
    }

    let cancelled = false;

    const fetchCategoryDetail = async () => {
      setIsDetailLoading(true);

      try {
        const response = await categoryApi.getById(selectedCategoryId);
        if (!cancelled) {
          setSelectedCategory(response.data || null);
        }
      } catch (error) {
        if (!cancelled) {
          setSelectedCategory(null);
          toast.error(getErrorMessage(error, "Could not load category details."));
        }
      } finally {
        if (!cancelled) {
          setIsDetailLoading(false);
        }
      }
    };

    fetchCategoryDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!isEditorOpen) {
      setImagePreviewUrl("");
      return;
    }

    if (formState.image_file) {
      const objectUrl = URL.createObjectURL(formState.image_file);
      setImagePreviewUrl(objectUrl);

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }

    setImagePreviewUrl(formState.image_url || "");
  }, [formState.image_file, formState.image_url, isEditorOpen]);

  const resetEditor = () => {
    setIsEditorOpen(false);
    setEditorMode("create");
    setEditorTarget(null);
    setFormState(createInitialFormState());
    setImageInputKey((current) => current + 1);
    setFormErrors({});
    setIsSubmitting(false);
  };

  const openCreateEditor = (parentId = "") => {
    setEditorMode("create");
    setEditorTarget(null);
    setFormErrors({});
    setFormState({
      ...createInitialFormState(),
      parent_id: parentId ? String(parentId) : "",
      display_order: "0",
    });
    setImageInputKey((current) => current + 1);
    setIsEditorOpen(true);
  };

  const openUpdateEditor = () => {
    const target = selectedCategory || selectedCategorySummary;
    if (!target) {
      return;
    }

    setEditorMode("update");
    setEditorTarget(target);
    setFormErrors({});
    setFormState({
      name: target.name || "",
      slug: target.slug || "",
      description: target.description || "",
      image_url: target.image_url || "",
      image_file: null,
      parent_id: target.parent_id ? String(target.parent_id) : "",
      display_order: String(target.display_order ?? 0),
      active: target.active ?? true,
    });
    setImageInputKey((current) => current + 1);
    setIsEditorOpen(true);
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formState.name.trim()) {
      nextErrors.name = "Category name is required";
    }

    if (!formState.slug.trim()) {
      nextErrors.slug = "Category slug is required";
    }

    if (
      formState.display_order !== "" &&
      Number.isNaN(Number(formState.display_order))
    ) {
      nextErrors.display_order = "Display order must be a number";
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;

    setFormState((current) => ({
      ...current,
      [name]: nextValue,
    }));

    if (formErrors[name]) {
      setFormErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[name];
        return nextErrors;
      });
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setFormState((current) => ({
        ...current,
        image_file: null,
      }));
      return;
    }

    if (!CATEGORY_IMAGE_TYPES.has(file.type)) {
      setFormErrors((current) => ({
        ...current,
        image: "Use JPG, PNG, or WEBP only.",
      }));
      setImageInputKey((current) => current + 1);
      return;
    }

    if (file.size > CATEGORY_IMAGE_MAX_SIZE) {
      setFormErrors((current) => ({
        ...current,
        image: "Image must be 5MB or smaller.",
      }));
      setImageInputKey((current) => current + 1);
      return;
    }

    setFormState((current) => ({
      ...current,
      image_file: file,
    }));

    setFormErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.image;
      return nextErrors;
    });
  };

  const handleDiscardSelectedFile = () => {
    setFormState((current) => ({
      ...current,
      image_file: null,
    }));
    setImageInputKey((current) => current + 1);
  };

  const handleRemoveCurrentImage = () => {
    setFormState((current) => ({
      ...current,
      image_file: null,
      image_url: "",
    }));
    setImageInputKey((current) => current + 1);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        name: formState.name.trim(),
        slug: formState.slug.trim(),
        description: formState.description || null,
        parent_id: formState.parent_id || null,
        display_order: Number(formState.display_order || 0),
        active: formState.active,
        image_url: formState.image_url || null,
      };

      let response;

      // =========================
      // CREATE
      // =========================
      if (editorMode === "create") {
        if (formState.image_file) {
          const formData = new FormData();

          Object.entries(payload).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              formData.append(key, value);
            }
          });

          formData.append("image", formState.image_file);

          response = await categoryApi.create(null, formState.image_file);
        } else {
          response = await categoryApi.create(payload);
        }

        toast.success("Category created successfully");
      }

      // =========================
      // UPDATE
      // =========================
      else {
        const formData = new FormData();
        formData.append(
          "data",
          new Blob([JSON.stringify(payload)], {
            type: "application/json",
          })
        );

        if (formState.image_file) {
          formData.append("image", formState.image_file);
        }

        response = await categoryApi.update(editorTarget.id, payload, formState.image_file);

        toast.success("Category updated successfully");
      }

      resetEditor();
      await loadCategories(selectedCategoryId);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save category."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);

    try {
      await categoryApi.delete(deleteTarget.id);
      toast.success("Category deleted successfully.");
      setDeleteTarget(null);
      await loadCategories();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete category."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="category-admin-page">
      <section className="category-hero">
        <div className="category-hero-copy">
          <span className="category-hero-eyebrow">Production Service</span>
          <h2>Category Management</h2>
          <p>
            Manage the category tree, keep product placement clean, and demo the
            root-versus-subcategory structure without leaving the admin panel.
          </p>
        </div>

        <div className="category-hero-actions">
          <button
            type="button"
            className="category-primary-btn"
            onClick={() => openCreateEditor("")}
          >
            <i className="fas fa-plus"></i>
            New Root Category
          </button>

          <button
            type="button"
            className="category-secondary-btn"
            onClick={() => loadCategories(selectedCategoryId)}
          >
            <i className="fas fa-rotate"></i>
            Refresh
          </button>
        </div>
      </section>

      <section className="category-stats-grid">
        <article className="category-stat-card">
          <span>Total nodes</span>
          <strong>{categoryStats.total}</strong>
          <small>Every category currently visible in the tree.</small>
        </article>
        <article className="category-stat-card">
          <span>Root categories</span>
          <strong>{categoryStats.roots}</strong>
          <small>Top-level buckets shown in the storefront tree.</small>
        </article>
        <article className="category-stat-card">
          <span>Active categories</span>
          <strong>{categoryStats.active}</strong>
          <small>Categories that can be used for live catalog flows.</small>
        </article>
        <article className="category-stat-card">
          <span>Linked to products</span>
          <strong>{categoryStats.withProducts}</strong>
          <small>Protected from delete when product_count is greater than zero.</small>
        </article>
      </section>

      <section className="category-toolbar">
        <div className="category-search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, slug, parent or description"
          />
        </div>

        <div className="category-filter-group">
          <span>Status</span>
          <div className="category-chip-group">
            {["all", "active", "inactive"].map((option) => (
              <button
                key={option}
                type="button"
                className={statusFilter === option ? "active" : ""}
                onClick={() => setStatusFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="category-filter-group">
          <span>Structure</span>
          <div className="category-chip-group">
            {[
              ["all", "Tree view"],
              ["roots", "Roots"],
              ["children", "Subcategories"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={structureFilter === value ? "active" : ""}
                onClick={() => setStructureFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="category-workspace">
        <div className="category-catalog-card">
          <div className="category-section-head">
            <div>
              <h3>Category Tree</h3>
              <p>
                Root categories return with nested children, matching the backend
                tree structure.
              </p>
            </div>
            <span className="category-list-count">
              {filteredCategories.length} items
            </span>
          </div>

          {isLoading ? (
            <div className="category-empty-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading categories...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="category-empty-state">
              <i className="fas fa-folder-open"></i>
              <p>No categories match the current filters.</p>
            </div>
          ) : (
            <div className="category-tree-list">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`category-tree-row ${
                    selectedCategoryId === category.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedCategoryId(category.id)}
                >
                  <div className="category-tree-main">
                    <div
                      className="category-tree-depth"
                      style={{ "--depth-level": category.depth }}
                    >
                      <span className="category-tree-branch"></span>
                    </div>

                    <div className="category-tree-copy">
                      <div className="category-tree-title-row">
                        <strong>{category.name}</strong>
                        <span
                          className={`category-status-pill ${
                            category.active ? "active" : "inactive"
                          }`}
                        >
                          {category.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="category-tree-meta">
                        <span>/{category.slug}</span>
                        <span>{category.product_count || 0} products</span>
                        <span>{category.child_count} direct children</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="category-detail-card">
          <div className="category-section-head">
            <div>
              <h3>Inspector</h3>
              <p>Read details, then create a child, update metadata, or delete.</p>
            </div>

            {selectedCategorySummary && (
              <div className="category-detail-actions">
                <button
                  type="button"
                  className="category-secondary-btn"
                  onClick={() => openCreateEditor(selectedCategorySummary.id)}
                >
                  <i className="fas fa-plus"></i>
                  New Child
                </button>
                <button
                  type="button"
                  className="category-secondary-btn"
                  onClick={openUpdateEditor}
                >
                  <i className="fas fa-pen"></i>
                  Edit
                </button>
                <button
                  type="button"
                  className="category-danger-btn"
                  onClick={() => setDeleteTarget(selectedCategorySummary)}
                >
                  <i className="fas fa-trash"></i>
                  Delete
                </button>
              </div>
            )}
          </div>

          {isDetailLoading ? (
            <div className="category-empty-state inspector">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading category details...</p>
            </div>
          ) : !selectedCategory ? (
            <div className="category-empty-state inspector">
              <i className="fas fa-hand-pointer"></i>
              <p>Select a category to inspect details.</p>
            </div>
          ) : (
            <>
              <div className="category-detail-hero">
                <div>
                  <span className="category-detail-label">
                    {selectedCategory.parent_id ? "Subcategory" : "Root category"}
                  </span>
                  <h4>{selectedCategory.name}</h4>
                  <p>{selectedCategory.description || "No description provided yet."}</p>
                </div>

                {selectedCategory.image_url ? (
                  <div
                    className="category-detail-image"
                    style={{ backgroundImage: `url(${selectedCategory.image_url})` }}
                  />
                ) : (
                  <div className="category-detail-placeholder">
                    <i className="fas fa-image"></i>
                  </div>
                )}
              </div>

              <div className="category-detail-grid">
                <article className="category-mini-card">
                  <span>Slug</span>
                  <strong>/{selectedCategory.slug}</strong>
                </article>
                <article className="category-mini-card">
                  <span>Parent</span>
                  <strong>
                    {selectedCategorySummary?.parent_name || "No parent"}
                  </strong>
                </article>
                <article className="category-mini-card">
                  <span>Products</span>
                  <strong>{selectedCategory.product_count || 0}</strong>
                </article>
                <article className="category-mini-card">
                  <span>Direct children</span>
                  <strong>{selectedCategory.subcategories?.length || 0}</strong>
                </article>
              </div>

              <div className="category-meta-grid">
                <div>
                  <span>Status</span>
                  <strong>{selectedCategory.active ? "Active" : "Inactive"}</strong>
                </div>
                <div>
                  <span>Display order</span>
                  <strong>{selectedCategory.display_order ?? 0}</strong>
                </div>
                <div>
                  <span>Created at</span>
                  <strong>{formatDate(selectedCategory.created_at)}</strong>
                </div>
                <div>
                  <span>Updated at</span>
                  <strong>{formatDate(selectedCategory.updated_at)}</strong>
                </div>
              </div>

              <div className="category-children-panel">
                <div className="category-section-head compact">
                  <div>
                    <h3>Subcategories</h3>
                    <p>These are returned inside the same tree response.</p>
                  </div>
                </div>

                {selectedCategory.subcategories?.length ? (
                  <div className="category-child-grid">
                    {selectedCategory.subcategories.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        className="category-child-chip"
                        onClick={() => setSelectedCategoryId(child.id)}
                      >
                        <strong>{child.name}</strong>
                        <span>/{child.slug}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="category-inline-empty">
                    No subcategories under this node yet.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {isEditorOpen && (
        <div className="category-modal-overlay" onClick={resetEditor}>
          <div
            className="category-modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="category-modal-head">
              <div>
                <span className="category-hero-eyebrow">
                  {editorMode === "create" ? "Create Category" : "Update Category"}
                </span>
                <h3>
                  {editorMode === "create"
                    ? "Build a new category node"
                    : `Edit ${editorTarget?.name}`}
                </h3>
              </div>
              <button
                type="button"
                className="category-close-btn"
                onClick={resetEditor}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="category-modal-body">
              <div className="category-form-grid">
                <label className="category-field">
                  <span>Name *</span>
                  <input
                    name="name"
                    value={formState.name}
                    onChange={handleFormChange}
                    placeholder="Beverages"
                  />
                  {formErrors.name && <small>{formErrors.name}</small>}
                </label>

                <label className="category-field">
                  <span>Slug *</span>
                  <input
                    name="slug"
                    value={formState.slug}
                    onChange={handleFormChange}
                    placeholder="beverages"
                  />
                  {formErrors.slug && <small>{formErrors.slug}</small>}
                </label>

                <label className="category-field category-field-wide">
                  <span>Description</span>
                  <textarea
                    name="description"
                    value={formState.description}
                    onChange={handleFormChange}
                    placeholder="Short admin-facing description for this category."
                  />
                </label>

                <label className="category-field category-field-wide">
                  <span>Category image</span>
                  <input
                    key={imageInputKey}
                    type="file"
                    name="image"
                    accept="image/png,image/jpeg,image/webp"
                    className="category-file-input"
                    onChange={handleImageChange}
                  />
                  <p className="category-field-hint">
                    Upload JPG, PNG, or WEBP up to 5MB. New uploads replace the current
                    image when you save.
                  </p>
                  {imagePreviewUrl ? (
                    <div className="category-upload-preview">
                      <img src={imagePreviewUrl} alt="Category preview" />
                      <div className="category-upload-copy">
                        <strong>
                          {formState.image_file
                            ? formState.image_file.name
                            : "Current category image"}
                        </strong>
                        <span>
                          {formState.image_file
                            ? "This file will be uploaded after you save."
                            : "This is the image currently attached to the category."}
                        </span>
                      </div>
                      <div className="category-upload-actions">
                        {formState.image_file ? (
                          <button
                            type="button"
                            className="category-upload-link"
                            onClick={handleDiscardSelectedFile}
                          >
                            Use current image
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="category-upload-link"
                            onClick={handleRemoveCurrentImage}
                          >
                            Remove current image
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="category-upload-empty">
                      <i className="fas fa-cloud-arrow-up"></i>
                      <span>No image selected yet.</span>
                    </div>
                  )}
                  {formErrors.image && <small>{formErrors.image}</small>}
                </label>

                <label className="category-field">
                  <span>Parent category</span>
                  <select
                    name="parent_id"
                    value={formState.parent_id}
                    onChange={handleFormChange}
                  >
                    {canChooseRootParent && <option value="">Root category</option>}
                    {parentOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {"- ".repeat(category.depth)}
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.parent_id && <small>{formErrors.parent_id}</small>}
                </label>

                <label className="category-field">
                  <span>Display order</span>
                  <input
                    name="display_order"
                    value={formState.display_order}
                    onChange={handleFormChange}
                    type="number"
                    placeholder="0"
                  />
                  {formErrors.display_order && <small>{formErrors.display_order}</small>}
                </label>

                <label className="category-checkbox">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formState.active}
                    onChange={handleFormChange}
                  />
                  <span>Active category</span>
                </label>
              </div>

              {!canChooseRootParent && editorMode === "update" && (
                <div className="category-contract-note">
                  This subcategory can be moved under another parent, but the current
                  backend update contract does not support detaching it directly to root.
                </div>
              )}
            </div>

            <div className="category-modal-actions">
              <button
                type="button"
                className="category-secondary-btn"
                onClick={resetEditor}
              >
                Cancel
              </button>
              <button
                type="button"
                className="category-primary-btn"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <i className={`fas ${isSubmitting ? "fa-spinner fa-spin" : "fa-save"}`}></i>
                {editorMode === "create" ? "Create category" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="category-modal-overlay category-danger-overlay"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="category-confirm-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="category-confirm-icon">
              <i className="fas fa-triangle-exclamation"></i>
            </div>
            <h3>Delete {deleteTarget.name}?</h3>
            <p>
              This uses the soft-delete backend endpoint. Categories linked to
              products or subcategories will be rejected by the service.
            </p>
            <div className="category-confirm-actions">
              <button
                type="button"
                className="category-secondary-btn"
                onClick={() => setDeleteTarget(null)}
              >
                Keep it
              </button>
              <button
                type="button"
                className="category-danger-btn"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <i className={`fas ${isDeleting ? "fa-spinner fa-spin" : "fa-trash"}`}></i>
                Delete category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoryPage;

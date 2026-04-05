import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "/api-auth/api/permissions";
const getToken = () => localStorage.getItem("accessToken");

export default function PermissionForm({ editing, onSuccess }) {
    const [form, setForm] = useState({
        name: "",
        resource: "",
        action: "",
        description: ""
    });

    const [loading, setLoading] = useState(false);

    const [fieldError, setFieldError] = useState({
        name: "",
        resource: ""
    });

    /* ===================== INIT FORM ===================== */
    useEffect(() => {
        if (editing) {
            setForm({
                name: editing.name || "",
                resource: editing.resource || "",
                action: editing.action || "",
                description: editing.description || ""
            });
            setFieldError({ name: "", resource: "" });
        } else {
            setForm({
                name: "",
                resource: "",
                action: "",
                description: ""
            });
            setFieldError({ name: "", resource: "" });
        }
    }, [editing]);

    /* ===================== HANDLERS ===================== */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));

        setFieldError(prev => ({ ...prev, [name]: "" }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFieldError({ name: "", resource: "" });

        const token = getToken();
        if (!token) {
            setFieldError({ name: "You are not logged in" });
            return;
        }

        setLoading(true);

        try {
            if (editing) {
                // UPDATE: chỉ cho sửa description
                await axios.put(
                    `${API_URL}/${editing.id}`,
                    { description: form.description },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } else {
                // CREATE
                await axios.post(
                    API_URL,
                    {
                        name: form.name,
                        resource: form.resource,
                        action: form.action,
                        description: form.description
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            onSuccess();

            if (!editing) {
                setForm({
                    name: "",
                    resource: "",
                    action: "",
                    description: ""
                });
            }

        } catch (err) {
            if (axios.isAxiosError(err)) {
                const status = err.response?.status;
                const msg = err.response?.data?.message;

                if (status === 409) {
                    setFieldError({
                        name: msg || "Permission already exists"
                    });
                } else {
                    setFieldError({
                        name: msg || "Save permission failed"
                    });
                }
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="permission-form" onSubmit={handleSubmit}>

            {/* ===== NAME ===== */}
            <label>
                Permission Name
                <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="USER_CREATE"
                    required
                    disabled={!!editing}
                    className={fieldError.name ? "input-error" : ""}
                />
                {fieldError.name && (
                    <small className="field-error">{fieldError.name}</small>
                )}
            </label>

            {/* ===== RESOURCE ===== */}
            <label>
                Resource
                <input
                    name="resource"
                    value={form.resource}
                    onChange={handleChange}
                    placeholder="USER / ROLE / PERMISSION"
                    required
                    disabled={!!editing}
                    className={fieldError.resource ? "input-error" : ""}
                />
                {fieldError.resource && (
                    <small className="field-error">{fieldError.resource}</small>
                )}
            </label>

            {/* ===== ACTION ===== */}
            <label>
                Action
                <input
                    name="action"
                    value={form.action}
                    onChange={handleChange}
                    placeholder="CREATE / READ / UPDATE / DELETE"
                    required
                    disabled={!!editing}
                />
            </label>

            {/* ===== DESCRIPTION ===== */}
            <label>
                Description
                <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Permission description"
                />
            </label>

            {/* ===== ACTIONS ===== */}
            <div className="form-actions">
                <button
                    className="btn-primary"
                    type="submit"
                    disabled={
                        loading ||
                        (!editing && (!form.name || !form.resource || !form.action))
                    }
                >
                    {loading ? "Saving..." : editing ? "Update" : "Create"}
                </button>
            </div>
        </form>
    );
}
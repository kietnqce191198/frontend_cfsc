import React from "react";

function PromotionTable({ promotions, onEdit, onDelete, onChangeStatus, onView, onSegmentTargeting }) {
  if (!promotions || promotions.length === 0) {
    return <div style={{ textAlign: "center", padding: "20px" }}>No promotions found.</div>;
  }

  // Format date helper (e.g., 2026-04-01T00:00:00 -> 01/04/2026)
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-GB");
  };

// Helper for Status
  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: "bg-secondary",
      ACTIVE: "bg-success",
      SCHEDULED: "bg-info",
      INACTIVE: "bg-warning text-dark",
      EXPIRED: "bg-danger"
    };
    return <span className={`badge ${styles[status] || "bg-primary"}`}>{status}</span>;
  };

  return (
    <div className="table-responsive">
      <table className="table table-bordered table-hover">
        <thead className="thead-dark">
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Value</th>
            <th>Validity Period</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {promotions.map((promo) => (
            <tr key={promo.id}>
              <td>{promo.id}</td>
              <td>
                <strong>{promo.name}</strong>
              </td>
              <td>{promo.type}</td>
              <td>{promo.value}</td>
              <td>
                <small>
                  <strong>Start:</strong> {formatDate(promo.startDate)} <br />
                  <strong>End:</strong> {formatDate(promo.endDate)}
                </small>
              </td>

              {/* STATUS */}
                <td className="text-center">
                                {getStatusBadge(promo.status)}
              </td>

              {/* ACTIONS */}
              <td className="text-center">
                <div className="d-flex justify-content-center align-items-center gap-2">
                  <button
                    className="btn btn-sm btn-info text-white shadow-sm"
                    onClick={() => onView(promo)}
                    title="View Details"
                  >
                    <i className="bi bi-eye mr-1"></i> View
                  </button>

                  {/* EDIT BUTTON */}
                  <button
                    className="btn btn-sm btn-outline-primary shadow-sm"
                    onClick={() => onEdit(promo)}
                    title="Edit Promotion"
                  >
                    <i className="bi bi-pencil mr-1"></i> Edit
                  </button>

                  {/* DELETE BUTTON (Disabled if ACTIVE) */}
                  <button
                    className="btn btn-sm btn-outline-danger shadow-sm"
                    onClick={() => onDelete(promo.id)}
                    title={promo.status === 'ACTIVE' ? "Cannot delete active promotion" : "Delete"}
                  >
                    <i className="bi bi-trash mr-1"></i> Delete
                  </button>
                  <button
                    className="btn btn-sm btn-outline-warning shadow-sm"
                    onClick={() => onSegmentTargeting?.(promo)}
                    title="Segment targeting"
                  >
                    <i className="bi bi-bullseye mr-1"></i> Segment
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PromotionTable;
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { engagementLoyaltyApi } from "../services/api";
import "../assets/loyalty-studio.css";

const BENEFIT_TYPES = ["DISCOUNT", "FREE_SHIPPING", "EXCLUSIVE_ACCESS", "BONUS_POINTS", "GIFT"];

const emptyBenefit = { id: null, type: "DISCOUNT", value: "", description: "" };

const normalizeConfig = (data) => ({
  points_per_currency: data?.points_per_currency ?? "0.0001",
  min_order_amount: data?.min_order_amount ?? "0",
  excluded_categories_text: Array.isArray(data?.excluded_categories)
    ? data.excluded_categories.join(", ")
    : "",
  expiration_months: data?.expiration_months ?? 12,
  evaluation_period_months: data?.evaluation_period_months ?? 12,
  inherit_from_lower_tiers: Boolean(data?.inherit_from_lower_tiers),
  tiers: Array.isArray(data?.tiers)
    ? data.tiers.map((tier) => ({
        id: tier.id,
        name: tier.name ?? "",
        min_points: tier.min_points ?? 0,
        max_points: tier.max_points ?? null,
        benefits: Array.isArray(tier.benefits) ? tier.benefits : [],
      }))
    : [],
});

function LoyaltyStudioPage() {
  const [editor, setEditor] = useState(() => normalizeConfig({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [selectedTierId, setSelectedTierId] = useState(null);
  const [selectedTierBenefits, setSelectedTierBenefits] = useState([]);
  const [benefitsLoading, setBenefitsLoading] = useState(false);
  const [benefitForm, setBenefitForm] = useState(emptyBenefit);

  const selectedTier = useMemo(
    () => editor.tiers.find((tier) => String(tier.id) === String(selectedTierId)) ?? null,
    [editor.tiers, selectedTierId]
  );

  const heroStatus = useMemo(() => {
    const savedTierCount = editor.tiers.filter((tier) => typeof tier.id === "number").length;
    return [
      `${savedTierCount} tiers`,
      editor.inherit_from_lower_tiers ? "Inheritance on" : "Inheritance off",
      selectedTier ? `${selectedTier.name} selected` : "No tier selected",
    ];
  }, [editor.inherit_from_lower_tiers, editor.tiers, selectedTier]);

  const loadConfig = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await engagementLoyaltyApi.getConfig();
      const normalized = normalizeConfig(data);
      setEditor(normalized);
      setSelectedTierId((current) =>
        current && normalized.tiers.some((tier) => String(tier.id) === String(current))
          ? current
          : normalized.tiers[0]?.id ?? null
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not load loyalty config");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadBenefits = async (tierId) => {
    if (!tierId || typeof tierId !== "number") {
      setSelectedTierBenefits([]);
      return;
    }

    setBenefitsLoading(true);
    try {
      const data = await engagementLoyaltyApi.getTierBenefits(tierId);
      setSelectedTierBenefits(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not load tier benefits");
    } finally {
      setBenefitsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (selectedTierId) {
      loadBenefits(selectedTierId);
      setBenefitForm(emptyBenefit);
    }
  }, [selectedTierId]);

  const patchEditor = (field, value) => setEditor((current) => ({ ...current, [field]: value }));

  const patchTier = (tierId, field, value) =>
    setEditor((current) => ({
      ...current,
      tiers: current.tiers.map((tier) =>
        String(tier.id) === String(tierId) ? { ...tier, [field]: value } : tier
      ),
    }));

  const addTier = () => {
    setEditor((current) => {
      const tiers = current.tiers.map((tier) => ({ ...tier }));
      const last = tiers[tiers.length - 1];
      const nextMin =
        last?.max_points !== null && last?.max_points !== undefined && last?.max_points !== ""
          ? Number(last.max_points) + 1
          : Number(last?.min_points || 0) + 1000;

      if (last && (last.max_points === null || last.max_points === "")) {
        last.max_points = nextMin - 1;
      }

      tiers.push({
        id: `draft-${Date.now()}`,
        name: `TIER_${tiers.length + 1}`,
        min_points: nextMin,
        max_points: null,
        benefits: [],
      });

      return { ...current, tiers };
    });
  };

  const removeTier = (tierId) => {
    setEditor((current) => {
      if (current.tiers.length <= 1) {
        toast.info("At least one tier must remain");
        return current;
      }

      const tiers = current.tiers.map((tier) => ({ ...tier }));
      const index = tiers.findIndex((tier) => String(tier.id) === String(tierId));
      if (index === -1) return current;

      tiers.splice(index, 1);

      if (index === 0 && tiers[0]) tiers[0].min_points = 0;
      if (index >= tiers.length && tiers[tiers.length - 1]) tiers[tiers.length - 1].max_points = null;
      if (index > 0 && index < tiers.length) {
        tiers[index - 1].max_points = Number(tiers[index].min_points) - 1;
      }

      if (String(selectedTierId) === String(tierId)) {
        setSelectedTierId(tiers[0]?.id ?? null);
      }

      return { ...current, tiers };
    });
  };

  const savePoints = async () => {
    setSaving("points");
    try {
      await engagementLoyaltyApi.updatePointsConfig({
        points_per_currency: Number(editor.points_per_currency),
        min_order_amount: Number(editor.min_order_amount),
        excluded_categories: editor.excluded_categories_text
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      await loadConfig(true);
      toast.success("Point rules saved");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save point rules");
    } finally {
      setSaving("");
    }
  };

  const saveTiming = async () => {
    setSaving("timing");
    try {
      await engagementLoyaltyApi.updateExpirationConfig({
        expiration_months: Number(editor.expiration_months),
        evaluation_period_months: Number(editor.evaluation_period_months),
      });
      await loadConfig(true);
      toast.success("Timing rules saved");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save timing rules");
    } finally {
      setSaving("");
    }
  };

  const saveTiers = async () => {
    setSaving("tiers");
    try {
      await engagementLoyaltyApi.updateTierConfig({
        inherit_from_lower_tiers: editor.inherit_from_lower_tiers,
        tiers: editor.tiers.map((tier) => ({
          id: typeof tier.id === "number" ? tier.id : undefined,
          name: tier.name,
          min_points: Number(tier.min_points),
          max_points:
            tier.max_points === null || tier.max_points === "" ? null : Number(tier.max_points),
          benefits: (tier.benefits || [])
            .filter((benefit) => !benefit.inherited)
            .map((benefit) => ({
              id: typeof benefit.id === "number" ? benefit.id : undefined,
              type: benefit.type,
              value: benefit.value,
              description: benefit.description,
            })),
        })),
      });
      await Promise.all([loadConfig(true), loadBenefits(selectedTierId)]);
      toast.success("Tier architecture saved");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save tier architecture");
    } finally {
      setSaving("");
    }
  };

  const saveBenefit = async () => {
    if (!selectedTierId || typeof selectedTierId !== "number") {
      toast.error("Save the tier before creating benefits");
      return;
    }

    setSaving("benefit");
    try {
      const payload = {
        type: benefitForm.type,
        value: benefitForm.value === "" ? null : Number(benefitForm.value),
        description: benefitForm.description,
      };

      if (benefitForm.id) {
        await engagementLoyaltyApi.updateTierBenefit(selectedTierId, benefitForm.id, payload);
      } else {
        await engagementLoyaltyApi.createTierBenefit(selectedTierId, payload);
      }

      setBenefitForm(emptyBenefit);
      await Promise.all([loadConfig(true), loadBenefits(selectedTierId)]);
      toast.success("Benefit saved");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save benefit");
    } finally {
      setSaving("");
    }
  };

  const startEdit = (benefit) => {
    if (benefit.inherited) {
      toast.info("Inherited benefits can only be viewed here");
      return;
    }

    setBenefitForm({
      id: benefit.id,
      type: benefit.type,
      value: benefit.value ?? "",
      description: benefit.description ?? "",
    });
  };

  const removeBenefit = async (benefit) => {
    if (benefit.inherited) {
      toast.info("Inherited benefits cannot be deleted from this tier");
      return;
    }

    setSaving(`delete-${benefit.id}`);
    try {
      await engagementLoyaltyApi.deleteTierBenefit(selectedTierId, benefit.id);
      await Promise.all([loadConfig(true), loadBenefits(selectedTierId)]);
      toast.success("Benefit deleted");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not delete benefit");
    } finally {
      setSaving("");
    }
  };

  if (loading) {
    return <div className="loyalty-studio-shell">Loading Loyalty Studio...</div>;
  }

  return (
    <div className="loyalty-studio-shell">
      <section className="loyalty-studio-hero">
        <div className="studio-hero-copy">
          <span className="studio-tag">Engagement Service</span>
          <h1>Loyalty Studio</h1>
          <div className="studio-summary">
            {heroStatus.map((item) => (
              <span key={item} className="studio-pill">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="studio-actions">
          <button className="studio-button ghost" onClick={() => loadConfig()}>
            Reload
          </button>
        </div>
      </section>

      <section className="studio-grid">
        <article className="studio-card">
          <div className="studio-head">
            <h2>Point Rules</h2>
            <button className="studio-button" onClick={savePoints} disabled={saving === "points"}>
              {saving === "points" ? "Saving..." : "Save"}
            </button>
          </div>

          <div className="studio-form">
            <label>
              <span>Points per currency</span>
              <input
                type="number"
                step="0.0001"
                value={editor.points_per_currency}
                onChange={(e) => patchEditor("points_per_currency", e.target.value)}
              />
            </label>

            <label>
              <span>Min order amount</span>
              <input
                type="number"
                min="0"
                value={editor.min_order_amount}
                onChange={(e) => patchEditor("min_order_amount", e.target.value)}
              />
            </label>

            <label className="full">
              <span>Excluded categories</span>
              <input
                type="text"
                placeholder="COFFEE_BEANS, MERCH"
                value={editor.excluded_categories_text}
                onChange={(e) => patchEditor("excluded_categories_text", e.target.value)}
              />
            </label>
          </div>
        </article>

        <article className="studio-card">
          <div className="studio-head">
            <h2>Timing Rules</h2>
            <button className="studio-button" onClick={saveTiming} disabled={saving === "timing"}>
              {saving === "timing" ? "Saving..." : "Save"}
            </button>
          </div>

          <div className="studio-form">
            <label>
              <span>Expiration months</span>
              <input
                type="number"
                min="1"
                value={editor.expiration_months}
                onChange={(e) => patchEditor("expiration_months", e.target.value)}
              />
            </label>

            <label>
              <span>Evaluation period months</span>
              <input
                type="number"
                min="1"
                value={editor.evaluation_period_months}
                onChange={(e) => patchEditor("evaluation_period_months", e.target.value)}
              />
            </label>
          </div>
        </article>
      </section>

      <section className="studio-card">
        <div className="studio-head">
          <h2>Tier Architecture</h2>
          <div className="studio-actions compact">
            <button className="studio-button ghost" onClick={addTier}>
              Add Tier
            </button>
            <button className="studio-button" onClick={saveTiers} disabled={saving === "tiers"}>
              {saving === "tiers" ? "Saving..." : "Save Tiers"}
            </button>
          </div>
        </div>

        <div className="studio-toolbar">
          <label className="switch inline-switch">
            <span>Benefit inheritance</span>
            <button
              className={editor.inherit_from_lower_tiers ? "toggle on" : "toggle"}
              onClick={() =>
                patchEditor("inherit_from_lower_tiers", !editor.inherit_from_lower_tiers)
              }
            >
              {editor.inherit_from_lower_tiers ? "Enabled" : "Disabled"}
            </button>
          </label>
        </div>

        <div className="tier-grid">
          {editor.tiers.map((tier) => (
            <article
              key={tier.id}
              className={`tier-card ${String(selectedTierId) === String(tier.id) ? "active" : ""}`}
            >
              <div className="studio-head">
                <strong>{tier.name}</strong>
                <div className="studio-actions compact">
                  <button
                    className="chip"
                    onClick={() =>
                      typeof tier.id === "number"
                        ? setSelectedTierId(tier.id)
                        : toast.info("Save the tier before editing benefits")
                    }
                  >
                    Benefits
                  </button>
                  <button className="chip danger" onClick={() => removeTier(tier.id)}>
                    Remove
                  </button>
                </div>
              </div>

              <div className="studio-form">
                <label>
                  <span>Name</span>
                  <input value={tier.name} onChange={(e) => patchTier(tier.id, "name", e.target.value)} />
                </label>

                <label>
                  <span>Min points</span>
                  <input
                    type="number"
                    min="0"
                    value={tier.min_points}
                    onChange={(e) => patchTier(tier.id, "min_points", e.target.value)}
                  />
                </label>

                <label>
                  <span>Max points</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="blank = MAX"
                    value={tier.max_points ?? ""}
                    onChange={(e) => patchTier(tier.id, "max_points", e.target.value)}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="studio-card">
        <div className="studio-head">
          <div className="studio-title-group">
            <h2>Tier Benefits</h2>
            {selectedTier && <span className="studio-pill strong">{selectedTier.name}</span>}
          </div>
          <span className="studio-muted">
            {benefitsLoading ? "Refreshing..." : `${selectedTierBenefits.length} items`}
          </span>
        </div>

        <div className="benefit-layout">
          <div className="tier-list">
            {editor.tiers
              .filter((tier) => typeof tier.id === "number")
              .map((tier) => (
                <button
                  key={tier.id}
                  className={String(selectedTierId) === String(tier.id) ? "active" : ""}
                  onClick={() => setSelectedTierId(tier.id)}
                >
                  <strong>{tier.name}</strong>
                  <small>
                    {tier.min_points} - {tier.max_points ?? "MAX"} pts
                  </small>
                </button>
              ))}
          </div>

          <div className="benefit-workspace">
            <div className="studio-form">
              <label>
                <span>Type</span>
                <select
                  value={benefitForm.type}
                  onChange={(e) => setBenefitForm((current) => ({ ...current, type: e.target.value }))}
                >
                  {BENEFIT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Value</span>
                <input
                  type="number"
                  min="0"
                  value={benefitForm.value}
                  onChange={(e) => setBenefitForm((current) => ({ ...current, value: e.target.value }))}
                />
              </label>

              <label className="full">
                <span>Description</span>
                <input
                  value={benefitForm.description}
                  onChange={(e) =>
                    setBenefitForm((current) => ({ ...current, description: e.target.value }))
                  }
                />
              </label>
            </div>

            <div className="studio-actions compact">
              <button className="studio-button" onClick={saveBenefit} disabled={saving === "benefit"}>
                {saving === "benefit" ? "Saving..." : benefitForm.id ? "Update Benefit" : "Create Benefit"}
              </button>
              <button className="studio-button ghost" onClick={() => setBenefitForm(emptyBenefit)}>
                Reset
              </button>
            </div>

            <div className="benefit-table">
              <div className="benefit-row head">
                <span>Type</span>
                <span>Value</span>
                <span>Description</span>
                <span>Source</span>
                <span>Actions</span>
              </div>

              {selectedTierBenefits.map((benefit) => (
                <div
                  key={`${benefit.id ?? benefit.type}-${benefit.source_tier_name}`}
                  className={`benefit-row ${benefit.inherited ? "inherited" : ""}`}
                >
                  <span>{benefit.type}</span>
                  <span>{benefit.value ?? "-"}</span>
                  <span>{benefit.description}</span>
                  <span>{benefit.inherited ? `Inherited from ${benefit.source_tier_name}` : "Direct"}</span>
                  <span className="studio-actions compact">
                    <button className="chip" onClick={() => startEdit(benefit)}>
                      Edit
                    </button>
                    <button
                      className="chip danger"
                      onClick={() => removeBenefit(benefit)}
                      disabled={saving === `delete-${benefit.id}`}
                    >
                      Delete
                    </button>
                  </span>
                </div>
              ))}

              {selectedTierBenefits.length === 0 && (
                <div className="empty-row">No benefits for this tier yet.</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LoyaltyStudioPage;

import { useEffect, useState } from "react";
import { loyaltyApi, customerApi } from "../services/api";
import { useNavigate } from "react-router-dom";
import "../assets/loyalty.css";
import '@fortawesome/fontawesome-free/css/all.min.css';

function LoyaltyPage() {
    const [loyalty, setLoyalty] = useState(null);
    const [points, setPoints] = useState([]);
    const [tiers, setTiers] = useState([]);
    const [allTiers, setAllTiers] = useState([]); // AC 35.1: List tiers
    const [redemptions, setRedemptions] = useState([]);
    const [tab, setTab] = useState("info");

    const [filterType, setFilterType] = useState("");
    const [filterFromDate, setFilterFromDate] = useState("");
    const [filterToDate, setFilterToDate] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem("accessToken");
            if (!token) return;
            const payload = JSON.parse(atob(token.split(".")[1]));
            
            const customerResp = await customerApi.getByUserId(payload.userId);
            const customerId = customerResp?.id || customerResp?.data?.id;
            if (!customerId) return;

            const [loyaltyRes, pointsRes, tierHistoryRes, redemRes, allTiersRes] = await Promise.all([
                loyaltyApi.getLoyaltyInfo(customerId),
                loyaltyApi.getPointsHistory(customerId),
                loyaltyApi.getTierHistory(customerId),
                loyaltyApi.getRedemptions(customerId),
                loyaltyApi.getAllTiers() // AC 35.1
            ]);

            setLoyalty(loyaltyRes?.data || loyaltyRes);
            setPoints(pointsRes?.data || pointsRes || []);
            setTiers(tierHistoryRes?.data || tierHistoryRes || []);
            setRedemptions(redemRes?.data || redemRes || []);
            setAllTiers(allTiersRes?.data || allTiersRes || []);
        } catch (err) {
            console.error("Fetch error:", err);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const isDateInRange = (dateStr) => {
        if (!filterFromDate && !filterToDate) return true;
        const targetDate = new Date(dateStr).setHours(0, 0, 0, 0);
        if (filterFromDate && targetDate < new Date(filterFromDate).setHours(0, 0, 0, 0)) return false;
        if (filterToDate && targetDate > new Date(filterToDate).setHours(23, 59, 59, 999)) return false;
        return true;
    };

    const resetFilters = () => {
        setFilterType("");
        setFilterFromDate("");
        setFilterToDate("");
    };

    return (
        <div className="account-page">
            <header className="header active">
                <div className="container d-flex align-items-center w-100">
                    <a href="/" className="logo"><i className="fas fa-mug-hot"></i> coffee</a>
                    <div className="account-page-actions">
                        <button className="link-btn account-top-btn" onClick={() => window.history.back()}>
                            <i className="fas fa-arrow-left"></i> <span>Back</span>
                        </button>
                    </div>
                </div>
            </header>

            <section className="account-page-shell">
                <div className="account-container-center">
                    <div className="account-card account-card-clean">
                        <div className="loyalty-header">
                            <h2>💎 Membership Program</h2>
                        </div>

                        <div className="loyalty-tabs">
                            <button onClick={() => { setTab("info"); resetFilters(); }} className={tab === "info" ? "active" : ""}>Overview</button>
                            <button onClick={() => { setTab("compare"); resetFilters(); }} className={tab === "compare" ? "active" : ""}>Tiers & Benefits</button>
                            <button onClick={() => { setTab("points"); resetFilters(); }} className={tab === "points" ? "active" : ""}>Points</button>
                            <button onClick={() => { setTab("redemptions"); resetFilters(); }} className={tab === "redemptions" ? "active" : ""}>Rewards</button>
                            <button onClick={() => { setTab("tier"); resetFilters(); }} className={tab === "tier" ? "active" : ""}>History</button>
                        </div>

                        {/* 1. OVERVIEW (AC 35.2 & 35.3) */}
                        {tab === "info" && loyalty && (
                            <div className="loyalty-info-container">
                                <div className="loyalty-main-card">
                                    <div className="tier-info">
                                        <p>Current Tier</p>
                                        <h3 className="tier-name">{loyalty.current_tier?.name}</h3>
                                    </div>
                                    <div className="points-info">
                                        <p>Available Points</p>
                                        <h3 className="points-display">{(loyalty.current_points || 0).toLocaleString()} <span>pts</span></h3>
                                        <button className="redeem-now-btn" onClick={() => navigate("/loyalty/redeem")}>
                                            <i className="fas fa-gift"></i> Redeem Now
                                        </button>
                                    </div>
                                </div>

                                {/* AC 35.3: Progress logic */}
                                {loyalty.current_tier?.name === 'DIAMOND' || loyalty.is_max_tier ? (
                                    <div className="max-tier-badge">
                                        <i className="fas fa-crown"></i> You've reached the Diamond Tier! Enjoy ultimate benefits.
                                    </div>
                                ) : (
                                    <div className="progress-section">
                                        <div className="progress-labels">
                                            <span>Progress to <strong>{loyalty.tier_progress?.nextTier}</strong></span>
                                            <span>{loyalty.tier_progress?.progressPercentage}%</span>
                                        </div>
                                        <div className="progress-bar-container">
                                            <div className="progress-fill" style={{ width: `${loyalty.tier_progress?.progressPercentage}%` }}></div>
                                        </div>
                                        <p className="progress-hint">
                                            Only {(loyalty.tier_progress?.pointsToNextTier || 0).toLocaleString()} more points to level up!
                                        </p>
                                    </div>
                                )}

                                <div className="benefits-list">
                                    <h4><i className="fas fa-gem"></i> Your {loyalty.current_tier?.name} Benefits:</h4>
                                    {loyalty.current_tier?.benefits?.map((b, i) => (
                                        <div key={i} className="benefit-item">
                                            <i className="fas fa-check-circle"></i> {b.description}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. TIER COMPARISON (AC 35.1 & 35.4) 🍓 */}
                        {tab === "compare" && (
                            <div className="history-section">
                                <div className="tiers-comparison-grid">
                                    {allTiers.map((tier) => {
                                        const isMax = tier.maxPoints >= 2147483647;
                                        const isCurrent = loyalty?.current_tier?.name === tier.name;
                                        
                                        return (
                                            <div key={tier.name} className={`tier-compare-card ${isCurrent ? 'current' : ''}`}>
                                                {isCurrent && <span className="your-tier-label">Your Current Tier</span>}
                                                <div className="tier-icon-circle">
                                                    <i className={`fas ${tier.name === 'DIAMOND' ? 'fa-gem' : tier.name === 'GOLD' ? 'fa-medal' : 'fa-award'}`}></i>
                                                </div>
                                                <h3>{tier.name}</h3>
                                                <p className="tier-range">
                                                    {(tier.minPoints || 0).toLocaleString()} - {isMax ? '∞' : (tier.maxPoints || 0).toLocaleString()} pts
                                                </p>
                                                <ul className="tier-benefits-mini">
                                                    {tier.benefits?.map((b, i) => (
                                                        <li key={i}><i className="fas fa-check"></i> {b.description}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 3. POINTS HISTORY */}
                        {tab === "points" && (
                            <div className="history-section">
                                <div className="filter-controls">
                                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                        <option value="">All Types</option>
                                        <option value="EARN">Earn</option>
                                        <option value="REDEEM">Redeem</option>
                                    </select>
                                    <input type="date" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} />
                                    <input type="date" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} />
                                    <button className="reset-btn" onClick={resetFilters}>Reset</button>
                                </div>
                                <div className="loyalty-table">
                                    {points.filter(p => (!filterType || p.type === filterType) && isDateInRange(p.createdAt)).map((p, i) => (
                                        <div key={i} className="loyalty-row">
                                            <div className="row-left">
                                                <span className={`type-tag ${p.type === 'EARN' ? 'tag-earn' : 'tag-redeem'}`}>{p.type}</span>
                                                <span className="description">{p.description}</span>
                                                <span className="date">{formatDate(p.createdAt)}</span>
                                            </div>
                                            <div className={`row-right ${p.type === 'EARN' ? 'plus' : 'minus'}`}>
                                                {p.type === 'EARN' ? `+${Math.abs(p.amount)}` : `-${Math.abs(p.amount)}`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. REDEEMED REWARDS */}
                        {tab === "redemptions" && (
                            <div className="history-section">
                                <div className="loyalty-table">
                                    {redemptions.filter(r => isDateInRange(r.createdAt)).map((r) => (
                                        <div key={r.id} className="loyalty-row">
                                            <div className="row-left">
                                                <span className="type-tag tag-redeem">{r.type.replace(/_/g, ' ')}</span>
                                                <span className="description">{r.rewardDescription || "Discount Reward"}</span>
                                                <span className="date">{formatDate(r.createdAt)}</span>
                                                <span className="status-label">{r.status}</span>
                                            </div>
                                            <div className="row-right minus">-{r.pointsUsed} pts</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 5. TIER HISTORY (AC 35.5) */}
                        {tab === "tier" && (
                            <div className="history-section">
                                <div className="loyalty-table">
                                    {tiers.filter(t => isDateInRange(t.changedAt)).map((t, i) => (
                                        <div key={i} className="loyalty-row">
                                            <div className="row-left">
                                                <div className="tier-path"><span>{t.fromTier}</span> <i className="fas fa-arrow-right"></i> <span>{t.toTier}</span></div>
                                                <span className="date">{formatDate(t.changedAt)}</span>
                                            </div>
                                            <div className="row-right icon-up"><i className="fas fa-chart-line"></i></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}

export default LoyaltyPage;
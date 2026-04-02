import React, { useEffect, useState } from "react";
import { loyaltyApi, customerApi } from "../services/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "../assets/loyalty.css";

// --- Interfaces ---
interface Reward {
    id: number;
    type?: string;
    name?: string;
    description?: string; // Khớp với Entity Reward bên Java của đại ca 🍓
    requiredPoints: number;
}

interface LoyaltyResponse {
    current_points?: number;
    data?: {
        current_points: number;
    };
}

const RedeemPage: React.FC = () => {
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [myPoints, setMyPoints] = useState<number>(0);
    const [customerId, setCustomerId] = useState<number | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (): Promise<void> => {
        try {
            const token = localStorage.getItem("accessToken");
            if (!token) return;

            const payload = JSON.parse(atob(token.split(".")[1]));
            const customerResp = await customerApi.getByUserId(payload.userId);
            const cId = customerResp?.id || customerResp?.data?.id;
            
            if (!cId) return;
            setCustomerId(cId);

            const [loyaltyRes, rewardRes] = await Promise.all([
                loyaltyApi.getLoyaltyInfo(cId),
                loyaltyApi.getAvailableRewards()
            ]);

            // Map dữ liệu điểm
            const lData = loyaltyRes as LoyaltyResponse;
            setMyPoints(lData?.data?.current_points ?? lData?.current_points ?? 0);
            
            // Map dữ liệu quà tặng
            const rData = (rewardRes?.data || rewardRes) as Reward[];
            setRewards(Array.isArray(rData) ? rData : []);

        } catch (err) {
            console.error("Load rewards error:", err);
            toast.error("Failed to load available rewards");
        }
    };

    const handleRedeem = async (rewardId: number, cost: number): Promise<void> => {
        if (!customerId) {
            toast.error("User session expired");
            return;
        }

        if (myPoints < cost) {
            toast.error("Not enough points!");
            return;
        }

        try {
            // Gọi API truyền Object { rewardId } vào Body 🍓
            await loyaltyApi.redeemReward(customerId, rewardId);
            
            toast.success("Redeemed successfully! 🎉");
            
            // Refresh lại dữ liệu để cập nhật số dư điểm mới
            await loadData(); 
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || "Redeem failed!";
            toast.error(errorMsg);
        }
    };

    return (
        <div className="account-page">
            <header className="header active">
                <div className="container d-flex align-items-center w-100">
                    <a className="logo" href="/"><i className="fas fa-mug-hot"></i> coffee</a>
                    <div className="account-page-actions">
                        <button 
                            className="link-btn account-top-btn" 
                            onClick={() => navigate("/loyalty")}
                        >
                            <i className="fas fa-times"></i> <span>Close</span>
                        </button>
                    </div>
                </div>
            </header>

            <section className="account-page-shell">
                <div className="account-container-center">
                    <div className="account-card account-card-clean" style={{ maxWidth: '1000px' }}>
                        <div className="redeem-header">
                            <h2>🎁 Available Rewards</h2>
                            <div className="current-balance-tag">
                                Your Balance: <strong>{myPoints.toLocaleString()} pts</strong>
                            </div>
                        </div>

                        <div className="rewards-list">
                            {rewards.length === 0 ? (
                                <p className="no-data">No rewards available at the moment</p>
                            ) : (
                                rewards.map((r) => (
                                    <div key={r.id} className="loyalty-row reward-item">
                                        <div className="row-left">
                                            <span className="type-tag tag-earn">{r.type?.replace(/_/g, ' ') || "VOUCHER"}</span>
                                            <span className="description">{r.name || r.description}</span>
                                            <span className="date">Points Required: {r.requiredPoints.toLocaleString()}</span>
                                        </div>
                                        <div className="row-right">
                                            <button 
                                                className="do-redeem-btn"
                                                disabled={myPoints < r.requiredPoints}
                                                onClick={() => handleRedeem(r.id, r.requiredPoints)}
                                            >
                                                {myPoints < r.requiredPoints ? "Locked" : "Redeem Now"}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default RedeemPage;
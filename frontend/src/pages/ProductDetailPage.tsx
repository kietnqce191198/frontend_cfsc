import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { productApi } from "../services/api";
import "../assets/product-detail.css";

const ProductDetailPage = () => {
    const { productId } = useParams();
    console.log(Number(productId));
    const [product, setProduct] = useState<any>(null);

    useEffect(() => {
        fetchDetail();
    }, [productId]);

    const fetchDetail = async () => {
        try {
            const res = await productApi.getProduct(Number(productId));
            setProduct(res?.data);
        } catch (err) {
            console.error("Fetch detail error:", err);
        }
    };

    if (!product) return <p className="loading">Loading...</p>;

    return (
        <div className="product-detail">

            {/* HEADER */}
            <div className="detail-header">
                <h2>{product.name}</h2>
                <span className={`status ${product.status.toLowerCase()}`}>
                    {product.status}
                </span>
            </div>

            {/* BASIC INFO */}
            <div className="detail-card">
                <h3>📦 Basic Info</h3>
                <p><strong>SKU:</strong> {product.sku}</p>
                <p><strong>Price:</strong> {product.price.toLocaleString()} đ</p>
                <p><strong>Description:</strong> {product.description}</p>
                <p><strong>Preparation Time:</strong> {product.preparationTime} mins</p>
                <p>
                    <strong>Status:</strong> {product.available ? "Available" : "Unavailable"}
                </p>
            </div>

            {/* CATEGORY */}
            <div className="detail-card">
                <h3>📂 Category</h3>
                <p><strong>Name:</strong> {product.category?.name}</p>
                <p><strong>Description:</strong> {product.category?.description}</p>
            </div>

            {/* TAGS */}
            <div className="detail-card">
                <h3>🏷 Tags</h3>
                {product.tags.length === 0 ? (
                    <p>No tags</p>
                ) : (
                    <div className="tag-list">
                        {product.tags.map((t: any) => (
                            <span key={t.id} className="tag">{t.name}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* INGREDIENT */}
            <div className="detail-card">
                <h3>🧂 Ingredients</h3>
                {product.ingredientSummary?.ingredients.length === 0 ? (
                    <p>No ingredients</p>
                ) : (
                    product.ingredientSummary.ingredients.map((i: any) => (
                        <div key={i.ingredientId}>
                            {i.name} - {i.quantity} {i.unit}
                        </div>
                    ))
                )}
                <p className="cost">
                    Total Cost: {product.ingredientSummary?.totalIngredientCost}
                </p>
            </div>

            {/* AVAILABILITY */}
            <div className="detail-card">
                <h3>🏪 Availability</h3>
                <p><strong>Global:</strong> {product.availability.globalAvailable ? "Yes" : "No"}</p>
                <p><strong>From:</strong> {product.availability.availableFrom}</p>
                <p><strong>To:</strong> {product.availability.availableUntil}</p>
                <p>
                    <strong>Auto Off When Out of Stock:</strong>{" "}
                    {product.availability.autoUnavailableWhenOutOfStock ? "Yes" : "No"}
                </p>
            </div>

            {/* IMAGES */}
            <div className="detail-card">
                <h3>🖼 Images</h3>
                {product.images.length === 0 ? (
                    <p>No images</p>
                ) : (
                    <div className="image-list">
                        {product.images.map((img: any) => (
                            <img key={img.id} src={img.imageUrl} alt="" />
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default ProductDetailPage;
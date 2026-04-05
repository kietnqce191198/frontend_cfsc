import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

type ProductImage = {
    imageUrl?: string;
    primary?: boolean;
};

type HomepageProduct = {
    id: number;
    name: string;
    price: number;
    description?: string;
    images?: ProductImage[];
};

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
});

const ProductSection: React.FC = () => {
    const [products, setProducts] = useState<HomepageProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProducts = async () => {
            const API_BASE = import.meta.env.VITE_API_PRODUCT || '/api-product';

            try {
                const res = await axios.get(`${API_BASE}/products/homepage`);
                setProducts(res.data?.content || res.data || []);
            } catch (error) {
                console.error('Failed to fetch products', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchProducts();
    }, []);

    if (loading) {
        return (
            <section className="menu storefront-products" id="products">
                <div className="container">
                    <span className="section-eyebrow">Signature Menu</span>
                    <h1 className="heading">Our special products</h1>
                    <p className="section-lead">
                        Loading the drinks and pastry picks customers reach for first.
                    </p>
                    <div className="storefront-products__status">Loading products...</div>
                </div>
            </section>
        );
    }

    if (products.length === 0) {
        return (
            <section className="menu storefront-products" id="products">
                <div className="container">
                    <span className="section-eyebrow">Signature Menu</span>
                    <h1 className="heading">Our special products</h1>
                    <br>
                    </br>
                    <div className="storefront-products__status">
                        Signature items will appear here once the product feed is ready.
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="menu storefront-products" id="menu">
            <span className="section-eyebrow">Signature Menu</span>
            <h1 className="heading">Our special products</h1>
            <br></br>
            <div className="container box-container storefront-products__grid">
                {products.map((product) => {
                    
                    const productId = product.id;
                    console.log("productId: " + productId);
                    const mainImage = product.images?.find((img) => img.primary)?.imageUrl
                        || product.images?.[0]?.imageUrl
                        || 'images/menu-1.png';
                    const description = product.description?.trim()
                        ? product.description.trim()
                        : 'A polished storefront pick built for everyday orders.';

                    return (
                        <article className="box storefront-product-card" key={productId}>
                            <button
                                type="button"
                                className="storefront-product-card__media"
                                onClick={() => navigate(`/product/${productId}`)}
                            >
                                <img
                                    src={mainImage}
                                    alt={product.name}
                                    className="storefront-product-card__image"
                                />
                            </button>

                            <div className="storefront-product-card__content">
                                <button
                                    type="button"
                                    className="storefront-product-card__title"
                                    onClick={() => navigate(`/product/${productId}`)}
                                >
                                    {product.name}
                                </button>

                                <div className="storefront-product-card__price">
                                    {CURRENCY_FORMATTER.format(product.price)}
                                </div>

                                <p>{description.length > 88 ? `${description.slice(0, 88)}...` : description}</p>

                                <div className="storefront-product-card__actions">
                                    <button
                                        type="button"
                                        className="link-btn"
                                        onClick={() => navigate(`/product/${productId}`)}
                                    >
                                        View item
                                    </button>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
};

export default ProductSection;
 
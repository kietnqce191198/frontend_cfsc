import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/style.css'; 
// Lưu ý: Nếu đại ca đã tách Header ra component riêng thì import vào, 
// nếu chưa, đại ca có thể copy phần JSX Header từ Homepage vào đây.

const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mainImage, setMainImage] = useState("");
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        const fetchProductDetail = async () => {
            const token = localStorage.getItem('accessToken');
            const API_BASE = import.meta.env.VITE_API_PRODUCT || '/api-product';

            try {
                const res = await axios.get(`${API_BASE}/products/${id}/detail`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const data = res.data?.data || res.data;
                setProduct(data);

                const primary = data.images?.find((img: any) => img.primary)?.imageUrl
                             || data.images?.[0]?.imageUrl
                             || "images/menu-1.png";
                setMainImage(primary);
            } catch (error) {
                console.error("Error fetching product detail", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProductDetail();
        window.scrollTo(0, 0);
    }, [id]);

    if (loading) return <div className="text-center p-5" style={{marginTop: '15rem', fontSize: '2rem'}}>Loading detail...</div>;
    if (!product) return <div className="text-center p-5" style={{marginTop: '15rem', fontSize: '2rem'}}>Product not found!</div>;

    return (
        <div className="product-detail-page" style={{ background: '#fdfaf7', minHeight: '100vh' }}>
            
            {/* 1. HEADER (Copy cấu trúc từ Homepage của đại ca sang để đồng bộ) */}
            
            <header className="header active">
                <div className="container d-flex align-items-center w-100">
                    <div onClick={() => navigate(`/`)} className="logo"><i className="fas fa-mug-hot"></i> coffee</div>
                    <div className="account-page-actions">
                        <button type="button" className="link-btn account-top-btn" onClick={() => navigate(-1)}>
                            <i className="fas fa-arrow-left"></i> <span>back</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* 2. MAIN CONTENT (Bọc trong section để có background và padding) */}
            <section className="about" id="product-detail" style={{ paddingTop: '15rem', paddingBottom: '10rem' }}>
                <div className="container" style={{ background: '#fff', padding: '3rem', borderRadius: '1.5rem', boxShadow: '0 1rem 3rem rgba(0,0,0,.1)' }}>
                    <div className="row align-items-center">
                        {/* Cột trái: Gallery */}
                        <div className="col-md-6">
                            <div className="main-image-container mb-4">
                                <img src={mainImage} className="w-100 rounded shadow-sm" alt={product.name} style={{ height: '400px', objectFit: 'cover' }} />
                            </div>
                            <div className="d-flex gap-2 overflow-auto pb-2 custom-scrollbar">
                                {product.images?.map((img: any) => (
                                    <img 
                                        key={img.id}
                                        src={img.imageUrl} 
                                        className={`rounded cursor-pointer ${mainImage === img.imageUrl ? 'border-active' : 'border-inactive'}`}
                                        style={{ width: '70px', height: '70px', objectFit: 'cover', cursor: 'pointer', border: '2px solid transparent' }}
                                        onClick={() => setMainImage(img.imageUrl)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Cột phải: Info */}
                        <div className="col-md-6">
                            <span className="sub-title" style={{ color: '#be9c79', fontSize: '1.8rem', fontWeight: '600' }}>
                                <i className="fas fa-tag"></i> {product.category?.name || 'Special Blend'}
                            </span>
                            <h3 className="title" style={{ fontSize: '3.5rem', color: '#512a10', margin: '1rem 0', textTransform: 'uppercase' }}>
                                {product.name}
                            </h3>
                            <div className="price-tag" style={{ fontSize: '2.8rem', color: '#be9c79', fontWeight: '800' }}>
                                {product.price.toLocaleString()} VND
                            </div>
                            
                            <p className="description" style={{ fontSize: '1.5rem', color: '#666', margin: '2rem 0', lineHeight: '1.8' }}>
                                {product.description || "Indulge in the rich, smooth flavors of our hand-picked coffee beans, roasted to perfection."}
                            </p>

                            <div className="d-flex align-items-center gap-4 mt-4">
                                <div className="qty-control" style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '.5rem' }}>
                                    <button className="btn" onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ padding: '1rem 1.5rem', fontSize: '1.8rem' }}>-</button>
                                    <span style={{ padding: '0 2rem', fontSize: '2rem', fontWeight: 'bold' }}>{quantity}</span>
                                    <button className="btn" onClick={() => setQuantity(quantity + 1)} style={{ padding: '1rem 1.5rem', fontSize: '1.8rem' }}>+</button>
                                </div>
                                <button className="link-btn" style={{ margin: 0 }}> <i className="fas fa-cart-plus"></i> Add to cart</button>
                            </div>

                            <div className="product-meta mt-5" style={{ borderTop: '1px solid #eee', paddingTop: '2rem', fontSize: '1.3rem', color: '#999' }}>
                                <p><strong>SKU:</strong> {product.sku}</p>
                                <p><strong>Category:</strong> {product.category?.name}</p>
                                <p><strong>Availability:</strong> 
                                    <span style={{ color: product.available ? '#27ae60' : '#e74c3c', marginLeft: '5px' }}>
                                        {product.available ? 'Available In Store' : 'Currently Out of Stock'}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER (Nên thêm vào cho trọn bộ) */}
            <footer className="footer" style={{ background: '#512a10', padding: '2rem', textAlign: 'center', color: '#fff' }}>
                <p style={{ fontSize: '1.5rem' }}>&copy; 2026 Coffee House | All Rights Reserved</p>
            </footer>
        </div>
    );
};

export default ProductDetail;
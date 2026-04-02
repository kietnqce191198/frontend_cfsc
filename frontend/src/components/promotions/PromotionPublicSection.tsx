import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SESSION_CHANGED_EVENT } from '../../lib/apiClient';
import { promotionApi } from '../../services/api';
import './promotion-public.css';

export type PromotionPublicItem = {
  name: string;
  description?: string | null;
  type: string;
  value: number;
  conditions?: string | null;
  end_date?: string | [number, number, number, number?, number?, number?, number?] | null;
  endDate?: string | [number, number, number, number?, number?, number?, number?] | null;
  image_url?: string | null;
  imageUrl?: string | null;
};

const PROMO_TYPES = [
  { value: '', label: 'Tất cả loại' },
  { value: 'PERCENTAGE_DISCOUNT', label: 'Giảm %' },
  { value: 'FIXED_DISCOUNT', label: 'Giảm cố định' },
  { value: 'BUY_X_GET_Y', label: 'Mua tặng' },
  { value: 'FREE_SHIPPING', label: 'Freeship' },
  { value: 'BUNDLE', label: 'Combo / bundle' },
];

/** Gửi API `category`: FOOD hoặc BEVERAGE — hiển thị tiếng Việt. */
const CATEGORY_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'FOOD', label: 'Đồ ăn' },
  { value: 'BEVERAGE', label: 'Đồ uống' },
];

function pickEndDate(p: PromotionPublicItem): string | null {
  const v = p.end_date ?? p.endDate;
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v.length >= 3) {
    const [y, m, d, h = 0, min = 0, sec = 0, nano = 0] = v;
    const ms = new Date(y, m - 1, d, h, min, sec, Math.floor(nano / 1e6)).getTime();
    return Number.isNaN(ms) ? null : new Date(ms).toISOString();
  }
  return String(v);
}

function formatEndDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function formatOffer(p: PromotionPublicItem): string {
  const t = p.type;
  const v = p.value;
  if (t === 'PERCENTAGE_DISCOUNT') return `Giảm ${v}%`;
  if (t === 'FIXED_DISCOUNT') return `Giảm ${Number(v).toLocaleString()} ₫`;
  if (t === 'FREE_SHIPPING') return 'Miễn phí giao hàng';
  if (t === 'BUY_X_GET_Y') return `Ưu đãi mua / tặng`;
  if (t === 'BUNDLE') return `Combo: ${Number(v).toLocaleString()} ₫`;
  return `${t}: ${v}`;
}

function buildAvailableParams(categoryFilter: string, typeFilter: string): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  const cat = categoryFilter.trim();
  if (cat) params.category = cat;
  if (typeFilter) params.type = typeFilter;
  return params;
}

function PromoCard({
  item,
  compact,
  featured,
}: {
  item: PromotionPublicItem;
  compact?: boolean;
  featured?: boolean;
}) {
  const img = item.image_url ?? item.imageUrl ?? '';
  const end = formatEndDate(pickEndDate(item));

  return (
    <article
      className={`promo-card ${compact ? 'promo-card--compact' : ''} ${featured ? 'promo-card--featured' : ''}`}
    >
      <div className="promo-card__media">
        {img && (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/')) ? (
          <img src={img} alt="" loading="lazy" />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.35)',
              fontSize: '4rem',
            }}
            aria-hidden
          >
            <i className="fas fa-tags" />
          </div>
        )}
        <span className="promo-card__badge">{item.type?.replace(/_/g, ' ') || 'PROMO'}</span>
      </div>
      <div className="promo-card__body">
        <h3 className="promo-card__title">{item.name}</h3>
        {item.description ? <p className="promo-card__desc">{item.description}</p> : null}
        <div className="promo-card__meta">
          <div>
            <strong>{formatOffer(item)}</strong>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            Hết hạn: <strong>{end}</strong>
          </div>
          {item.conditions ? (
            <div style={{ marginTop: '0.6rem', fontSize: '1.2rem', color: '#78716c' }} title={item.conditions}>
              Điều kiện: {item.conditions.length > 120 ? `${item.conditions.slice(0, 120)}…` : item.conditions}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const PromotionPublicSection: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  const promotionPublicApi = promotionApi as unknown as {
    getFeatured: (params?: Record<string, string | number>) => Promise<{ data: PromotionPublicItem[] }>;
    getAvailable: (params?: Record<string, string | number>) => Promise<{ data: PromotionPublicItem[] }>;
  };

  const [featured, setFeatured] = useState<PromotionPublicItem[]>([]);
  const [available, setAvailable] = useState<PromotionPublicItem[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [errorFeatured, setErrorFeatured] = useState<string | null>(null);
  const [errorAvailable, setErrorAvailable] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const featuredScrollRef = useRef<HTMLDivElement>(null);

  const loadFeatured = useCallback(async () => {
    console.log('loadFeatured: Loading featured promotions');
    setLoadingFeatured(true);
    setErrorFeatured(null);
    try {
      const res = await promotionPublicApi.getFeatured();
      const data = Array.isArray(res.data) ? res.data : [];
      console.log('loadFeatured: Loaded', data.length, 'featured promotions');
      setFeatured(data as PromotionPublicItem[]);
    } catch (e: unknown) {
      console.error('loadFeatured: Error loading featured promotions', e);
      setFeatured([]);
      setErrorFeatured('Không tải được khuyến mãi nổi bật.');
    } finally {
      setLoadingFeatured(false);
    }
  }, []);

  const fetchAvailable = useCallback(async () => {
    console.log('fetchAvailable: Loading available promotions with filters:', { categoryFilter, typeFilter });
    setLoadingAvailable(true);
    setErrorAvailable(null);
    try {
      const params = buildAvailableParams(categoryFilter, typeFilter);
      const res = await promotionPublicApi.getAvailable(params);
      const data = Array.isArray(res.data) ? res.data : [];
      console.log('fetchAvailable: Loaded', data.length, 'available promotions');
      setAvailable(data as PromotionPublicItem[]);
    } catch (e: unknown) {
      console.error('fetchAvailable: Error loading available promotions', e);
      setAvailable([]);
      setErrorAvailable('Không tải được danh sách khuyến mãi.');
    } finally {
      setLoadingAvailable(false);
    }
  }, [categoryFilter, typeFilter]);

  const scrollFeatured = (dir: -1 | 1) => {
    const el = featuredScrollRef.current;
    if (!el) return;
    const step = Math.max(240, Math.min(el.clientWidth * 0.85, 520));
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  useEffect(() => {
    loadFeatured();
  }, [loadFeatured]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingAvailable(true);
      setErrorAvailable(null);
      try {
        const res = await promotionPublicApi.getAvailable(buildAvailableParams('', ''));
        if (!cancelled) {
          const data = Array.isArray(res.data) ? res.data : [];
          setAvailable(data as PromotionPublicItem[]);
        }
      } catch {
        if (!cancelled) {
          setAvailable([]);
          setErrorAvailable('Không tải được danh sách khuyến mãi.');
        }
      } finally {
        if (!cancelled) setLoadingAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Login/logout: gọi lại featured + available (Bearer đổi → backend trả list khác). */
  useEffect(() => {
    const onSessionChanged = () => {
      console.log('PromotionPublicSection: Session changed event received');
      setRefreshKey(prev => prev + 1); // Force refresh by changing key
    };
    console.log('PromotionPublicSection: Adding session change listener');
    window.addEventListener(SESSION_CHANGED_EVENT, onSessionChanged);
    return () => {
      console.log('PromotionPublicSection: Removing session change listener');
      window.removeEventListener(SESSION_CHANGED_EVENT, onSessionChanged);
    };
  }, []);

  // Refresh data when refreshKey changes
  useEffect(() => {
    console.log('PromotionPublicSection: Refresh key changed, reloading data');
    void loadFeatured();
    void fetchAvailable();
  }, [refreshKey]);

  // Listen for localStorage changes (token changes)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken') {
        console.log('PromotionPublicSection: Token changed in localStorage, refreshing data');
        setRefreshKey(prev => prev + 1);
      }
    };

    console.log('PromotionPublicSection: Adding storage listener');
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      console.log('PromotionPublicSection: Removing storage listener');
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Also check token periodically as fallback
  useEffect(() => {
    let lastToken = localStorage.getItem('accessToken');
    
    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('accessToken');
      if (currentToken !== lastToken) {
        console.log('PromotionPublicSection: Token change detected by polling, refreshing data');
        lastToken = currentToken;
        setRefreshKey(prev => prev + 1);
      }
    }, 1000); // Check every second

    return () => {
      clearInterval(interval);
    };
  }, []);

  const applyFilters = () => {
    fetchAvailable();
  };

  const manualRefresh = () => {
    console.log('PromotionPublicSection: Manual refresh triggered');
    setRefreshKey(prev => prev + 1);
  };

  return (
    <section className="promo-public-section" id="promotions">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="heading" style={{ margin: 0 }}>ưu đãi & khuyến mãi</h1>
        <button 
          onClick={manualRefresh}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          🔄 Làm mới
        </button>
      </div>

      <div className="container">
        <h2 className="heading" style={{ fontSize: '2.4rem', marginBottom: '1rem' }}>
          Nổi bật
        </h2>
        {loadingFeatured && <div className="promo-loading">Đang tải khuyến mãi nổi bật…</div>}
        {errorFeatured && <div className="promo-error">{errorFeatured}</div>}
        {!loadingFeatured && !errorFeatured && featured.length === 0 && (
          <div className="promo-empty">Hiện chưa có chương trình nổi bật.</div>
        )}
        {!loadingFeatured && featured.length > 0 && (
          <div className="promo-featured-carousel">
            <div className="promo-featured-carousel-layout">
              <button
                type="button"
                className="promo-featured-nav promo-featured-nav--prev"
                onClick={() => scrollFeatured(-1)}
                aria-label="Cuộn khuyến mãi sang trái"
              >
                <i className="fas fa-chevron-left" aria-hidden />
              </button>
              <div
                ref={featuredScrollRef}
                className="promo-featured-scroll"
                tabIndex={0}
              >
                {featured.map((item, idx) => (
                  <div key={`${item.name}-fe-${idx}`} className="promo-featured-scroll-item">
                    <PromoCard item={item} featured />
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="promo-featured-nav promo-featured-nav--next"
                onClick={() => scrollFeatured(1)}
                aria-label="Cuộn khuyến mãi sang phải"
              >
                <i className="fas fa-chevron-right" aria-hidden />
              </button>
            </div>
          </div>
        )}

        <h2 className="heading" style={{ fontSize: '2.4rem', marginTop: '4rem', marginBottom: '1rem' }}>
          Đang áp dụng
        </h2>

        <div className="promo-filters">
          <label>
            Danh mục
            <select
              className="promo-filters__category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Danh mục sản phẩm"
            >
              {CATEGORY_FILTER_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Loại khuyến mãi
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {PROMO_TYPES.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="promo-filters__actions">
            <button type="button" className="promo-btn" onClick={applyFilters} disabled={loadingAvailable}>
              {loadingAvailable ? 'Đang tải…' : 'Áp dụng bộ lọc'}
            </button>
          </div>
        </div>

        {loadingAvailable && <div className="promo-loading">Đang tải danh sách…</div>}
        {errorAvailable && !loadingAvailable && <div className="promo-error">{errorAvailable}</div>}
        {!loadingAvailable && !errorAvailable && available.length === 0 && (
          <div className="promo-empty">Không có khuyến mãi phù hợp bộ lọc.</div>
        )}
        {!loadingAvailable && available.length > 0 && (
          <div className="promo-grid">
            {available.map((item, idx) => (
              <PromoCard key={`${item.name}-av-${idx}`} item={item} compact />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PromotionPublicSection;

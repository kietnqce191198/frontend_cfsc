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
  { value: '', label: 'All types' },
  { value: 'PERCENTAGE_DISCOUNT', label: 'Percentage discount' },
  { value: 'FIXED_DISCOUNT', label: 'Fixed discount' },
  { value: 'BUY_X_GET_Y', label: 'Buy X Get Y' },
  { value: 'FREE_SHIPPING', label: 'Free shipping' },
  { value: 'BUNDLE', label: 'Bundle offer' },
];

const CATEGORY_FILTER_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'FOOD', label: 'Food' },
  { value: 'BEVERAGE', label: 'Beverage' },
];

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const PROMOTION_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE_DISCOUNT: 'Percentage Discount',
  FIXED_DISCOUNT: 'Fixed Discount',
  BUY_X_GET_Y: 'Buy X Get Y',
  FREE_SHIPPING: 'Free Shipping',
  BUNDLE: 'Bundle Offer',
};

function formatPromotionType(type?: string | null): string {
  if (!type) {
    return 'Promotion';
  }
  return PROMOTION_TYPE_LABELS[type] ?? type.replace(/_/g, ' ');
}

function pickEndDate(promotion: PromotionPublicItem): string | null {
  const value = promotion.end_date ?? promotion.endDate;
  if (value == null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] = value;
    const ms = new Date(year, month - 1, day, hour, minute, second, Math.floor(nano / 1e6)).getTime();
    return Number.isNaN(ms) ? null : new Date(ms).toISOString();
  }
  return String(value);
}

function formatEndDate(value: string | null): string {
  if (!value) {
    return 'Not specified';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DATE_TIME_FORMATTER.format(date);
}

function formatOffer(promotion: PromotionPublicItem): string {
  const type = promotion.type;
  const value = Number(promotion.value);

  if (type === 'PERCENTAGE_DISCOUNT') {
    return `${value}% off`;
  }
  if (type === 'FIXED_DISCOUNT') {
    return `${CURRENCY_FORMATTER.format(value)} off`;
  }
  if (type === 'FREE_SHIPPING') {
    return 'Free shipping';
  }
  if (type === 'BUY_X_GET_Y') {
    return 'Buy X, get Y';
  }
  if (type === 'BUNDLE') {
    return 'Bundle offer';
  }
  return `${formatPromotionType(type)}: ${value}`;
}

function buildAvailableParams(categoryFilter: string, typeFilter: string): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  const category = categoryFilter.trim();
  if (category) {
    params.category = category;
  }
  if (typeFilter) {
    params.type = typeFilter;
  }
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
  const image = item.image_url ?? item.imageUrl ?? '';
  const endDate = formatEndDate(pickEndDate(item));
  const terms = item.conditions
    ? item.conditions.length > 120
      ? `${item.conditions.slice(0, 120)}...`
      : item.conditions
    : null;

  return (
    <article
      className={`promo-card ${compact ? 'promo-card--compact' : ''} ${featured ? 'promo-card--featured' : ''}`}
    >
      <div className="promo-card__media">
        {image && (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/')) ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <div className="promo-card__placeholder" aria-hidden>
            <i className="fas fa-tags" />
          </div>
        )}
        <span className="promo-card__badge">{formatPromotionType(item.type)}</span>
      </div>
      <div className="promo-card__body">
        <h3 className="promo-card__title">{item.name}</h3>
        {item.description ? <p className="promo-card__desc">{item.description}</p> : null}
        <div className="promo-card__meta">
          <div>
            <strong>{formatOffer(item)}</strong>
          </div>
          <div className="promo-card__meta-row">
            Expires: <strong>{endDate}</strong>
          </div>
          {terms ? (
            <div className="promo-card__terms" title={item.conditions ?? undefined}>
              Terms: {terms}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const PromotionPublicSection: React.FC = () => {
  const promotionPublicApi = promotionApi as unknown as {
    getFeatured: (params?: Record<string, string | number>) => Promise<{ data: PromotionPublicItem[] }>;
    getAvailable: (params?: Record<string, string | number>) => Promise<{ data: PromotionPublicItem[] }>;
  };

  const [refreshKey, setRefreshKey] = useState(0);
  const [featured, setFeatured] = useState<PromotionPublicItem[]>([]);
  const [available, setAvailable] = useState<PromotionPublicItem[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [errorFeatured, setErrorFeatured] = useState<string | null>(null);
  const [errorAvailable, setErrorAvailable] = useState<string | null>(null);
  const [filterDraft, setFilterDraft] = useState({ category: '', type: '' });
  const [activeFilters, setActiveFilters] = useState({ category: '', type: '' });
  const featuredScrollRef = useRef<HTMLDivElement>(null);

  const loadFeatured = useCallback(async () => {
    setLoadingFeatured(true);
    setErrorFeatured(null);

    try {
      const response = await promotionPublicApi.getFeatured();
      setFeatured(Array.isArray(response.data) ? (response.data as PromotionPublicItem[]) : []);
    } catch {
      setFeatured([]);
      setErrorFeatured('Could not load featured promotions.');
    } finally {
      setLoadingFeatured(false);
    }
  }, [promotionPublicApi]);

  const loadAvailable = useCallback(async () => {
    setLoadingAvailable(true);
    setErrorAvailable(null);

    try {
      const params = buildAvailableParams(activeFilters.category, activeFilters.type);
      const response = await promotionPublicApi.getAvailable(params);
      setAvailable(Array.isArray(response.data) ? (response.data as PromotionPublicItem[]) : []);
    } catch {
      setAvailable([]);
      setErrorAvailable('Could not load available promotions.');
    } finally {
      setLoadingAvailable(false);
    }
  }, [activeFilters.category, activeFilters.type, promotionPublicApi]);

  const reloadPromotions = useCallback(() => {
    void loadFeatured();
    void loadAvailable();
  }, [loadAvailable, loadFeatured]);

  const scrollFeatured = (direction: -1 | 1) => {
    const element = featuredScrollRef.current;
    if (!element) {
      return;
    }
    const step = Math.max(240, Math.min(element.clientWidth * 0.85, 520));
    element.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  useEffect(() => {
    reloadPromotions();
  }, [reloadPromotions, refreshKey]);

  useEffect(() => {
    const onSessionChanged = () => {
      setRefreshKey((value) => value + 1);
    };

    window.addEventListener(SESSION_CHANGED_EVENT, onSessionChanged);
    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, onSessionChanged);
    };
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'accessToken') {
        setRefreshKey((value) => value + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let lastToken = localStorage.getItem('accessToken');

    const intervalId = window.setInterval(() => {
      const currentToken = localStorage.getItem('accessToken');
      if (currentToken !== lastToken) {
        lastToken = currentToken;
        setRefreshKey((value) => value + 1);
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const applyFilters = () => {
    setActiveFilters({ ...filterDraft });
  };

  const manualRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  return (
    <section className="promo-public-section" id="promotions">
      <div className="promo-public-section__intro container">
        <div className="promo-public-section__copy">
          <span className="section-eyebrow">Live Offers</span>
          <h1 className="heading">Offers & Promotions</h1>
          <p className="section-lead">
            Featured drops, practical bundles, and current reasons to order now without crowding the storefront.
          </p>
        </div>
        <button
          type="button"
          className="promo-refresh-btn"
          onClick={manualRefresh}
        >
          Refresh
        </button>
      </div>

      <div className="container">
        <h2 className="heading promo-section-title">
          Featured
        </h2>
        {loadingFeatured && <div className="promo-loading">Loading featured promotions...</div>}
        {errorFeatured && <div className="promo-error">{errorFeatured}</div>}
        {!loadingFeatured && !errorFeatured && featured.length === 0 && (
          <div className="promo-empty">No featured promotions are available right now.</div>
        )}
        {!loadingFeatured && featured.length > 0 && (
          <div className="promo-featured-carousel">
            <div className="promo-featured-carousel-layout">
              <button
                type="button"
                className="promo-featured-nav promo-featured-nav--prev"
                onClick={() => scrollFeatured(-1)}
                aria-label="Scroll featured promotions left"
              >
                <i className="fas fa-chevron-left" aria-hidden />
              </button>
              <div ref={featuredScrollRef} className="promo-featured-scroll" tabIndex={0}>
                {featured.map((item, index) => (
                  <div key={`${item.name}-featured-${index}`} className="promo-featured-scroll-item">
                    <PromoCard item={item} featured />
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="promo-featured-nav promo-featured-nav--next"
                onClick={() => scrollFeatured(1)}
                aria-label="Scroll featured promotions right"
              >
                <i className="fas fa-chevron-right" aria-hidden />
              </button>
            </div>
          </div>
        )}

        <h2 className="heading promo-section-title promo-section-title--spaced">
          Available Now
        </h2>

        <div className="promo-filters">
          <label>
            Category
            <select
              className="promo-filters__category"
              value={filterDraft.category}
              onChange={(event) => setFilterDraft((value) => ({ ...value, category: event.target.value }))}
              aria-label="Promotion category"
            >
              {CATEGORY_FILTER_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Promotion type
            <select
              value={filterDraft.type}
              onChange={(event) => setFilterDraft((value) => ({ ...value, type: event.target.value }))}
              aria-label="Promotion type"
            >
              {PROMO_TYPES.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="promo-filters__actions">
            <button type="button" className="promo-btn" onClick={applyFilters} disabled={loadingAvailable}>
              {loadingAvailable ? 'Loading...' : 'Apply filters'}
            </button>
          </div>
        </div>

        {loadingAvailable && <div className="promo-loading">Loading promotions...</div>}
        {errorAvailable && !loadingAvailable && <div className="promo-error">{errorAvailable}</div>}
        {!loadingAvailable && !errorAvailable && available.length === 0 && (
          <div className="promo-empty">No promotions match the current filters.</div>
        )}
        {!loadingAvailable && available.length > 0 && (
          <div className="promo-grid">
            {available.map((item, index) => (
              <PromoCard key={`${item.name}-available-${index}`} item={item} compact />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PromotionPublicSection;

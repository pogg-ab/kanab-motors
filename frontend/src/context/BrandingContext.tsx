import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, CompanyBranding, resolveCompanyAssetUrl } from '../api/client';

interface BrandingContextValue {
  branding: CompanyBranding;
  resolvedLogoUrl?: string;
  refreshBranding: () => Promise<void>;
  applyBranding: (next: Partial<CompanyBranding>) => void;
}

const DEFAULT_BRANDING: CompanyBranding = {
  companyName: 'KANAB MOTORS',
  tradeName: 'Enterprise SIMS',
};

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  refreshBranding: async () => {},
  applyBranding: () => {},
});

function inferFaviconType(url: string): string | undefined {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.ico')) return 'image/x-icon';
  return undefined;
}

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<CompanyBranding>(DEFAULT_BRANDING);

  const refreshBranding = useCallback(async () => {
    try {
      const data = await api.getCompanyBranding();
      if (data?.companyName) {
        setBranding({
          companyName: data.companyName.trim(),
          tradeName: data.tradeName?.trim() || undefined,
          logo: data.logo?.trim() || undefined,
          country: data.country,
        });
      }
    } catch {
      // Keep current/default branding if backend is unreachable
    }
  }, []);

  const applyBranding = useCallback((next: Partial<CompanyBranding>) => {
    setBranding((prev) => ({
      ...prev,
      ...next,
      companyName: next.companyName?.trim() || prev.companyName || DEFAULT_BRANDING.companyName,
      tradeName: next.tradeName !== undefined ? (next.tradeName.trim() || undefined) : prev.tradeName,
      logo: next.logo !== undefined ? (next.logo.trim() || undefined) : prev.logo,
    }));
  }, []);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  const resolvedLogoUrl = useMemo(
    () => resolveCompanyAssetUrl(branding.logo),
    [branding.logo],
  );

  // Sync browser tab title and favicon to the registered company name and uploaded logo
  useEffect(() => {
    const titleName = branding.companyName?.trim() || DEFAULT_BRANDING.companyName;
    document.title = titleName;

    const iconHref = resolvedLogoUrl || '/favicon.svg';
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    const inferredType = inferFaviconType(iconHref);
    if (inferredType) {
      link.type = inferredType;
    } else {
      link.removeAttribute('type');
    }
    link.href = iconHref;
  }, [branding.companyName, resolvedLogoUrl]);

  return (
    <BrandingContext.Provider value={{ branding, resolvedLogoUrl, refreshBranding, applyBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);


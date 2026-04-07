import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  siteTitle: string;
  siteSubtitle: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

interface SiteSettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (nextSettings: Partial<SiteSettings>) => void;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: "চাকরির প্রস্তুতি",
  siteSubtitle: "সম্পূর্ণ বাংলা MCQ প্রস্তুতি প্ল্যাটফর্ম",
  logoUrl: null,
  faviconUrl: null,
};

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

const toSiteSettings = (
  data:
    | {
        site_title?: string | null;
        site_subtitle?: string | null;
        logo_url?: string | null;
        favicon_url?: string | null;
      }
    | null
    | undefined,
): SiteSettings => ({
  siteTitle: data?.site_title?.trim() || DEFAULT_SETTINGS.siteTitle,
  siteSubtitle: data?.site_subtitle?.trim() || DEFAULT_SETTINGS.siteSubtitle,
  logoUrl: data?.logo_url?.trim() || null,
  faviconUrl: data?.favicon_url?.trim() || null,
});

const ensureFaviconElement = () => {
  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  return link;
};

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("site_title, site_subtitle, logo_url, favicon_url")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    setSettings(toSiteSettings(data));
  };

  const updateSettings = (nextSettings: Partial<SiteSettings>) => {
    setSettings((current) => ({
      ...current,
      ...nextSettings,
    }));
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        await refreshSettings();
      } catch {
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  useEffect(() => {
    document.title = settings.siteTitle;

    const description = document.querySelector("meta[name='description']");
    if (description) {
      description.setAttribute("content", settings.siteSubtitle);
    }

    const ogTitle = document.querySelector("meta[property='og:title']");
    if (ogTitle) {
      ogTitle.setAttribute("content", settings.siteTitle);
    }

    const ogDescription = document.querySelector("meta[property='og:description']");
    if (ogDescription) {
      ogDescription.setAttribute("content", settings.siteSubtitle);
    }

    const favicon = ensureFaviconElement();
    favicon.href = settings.faviconUrl || "/favicon.ico";
  }, [settings]);

  const value = {
    settings,
    loading,
    refreshSettings,
    updateSettings,
  };

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);

  if (!context) {
    throw new Error("useSiteSettings must be used within SiteSettingsProvider");
  }

  return context;
}

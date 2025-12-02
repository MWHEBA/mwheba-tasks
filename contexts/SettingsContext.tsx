import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AppSettings } from '../types';
import { SettingsService } from '../services/settingsService';

interface SettingsContextType {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const refreshSettings = useCallback(async (force = false) => {
    // Auto-refresh if data is older than 30 seconds
    const now = Date.now();
    const cacheAge = now - lastFetch;
    
    if (!force && cacheAge < 30000 && settings !== null) {
      // Data is fresh, no need to refresh
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fetchedSettings = await SettingsService.get();
      setSettings(fetchedSettings);
      setLastFetch(Date.now());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'فشل تحميل الإعدادات';
      setError(errorMessage);
      console.error('Error refreshing settings:', err);
    } finally {
      setLoading(false);
    }
  }, [lastFetch, settings]);

  const updateSettings = useCallback(async (newSettings: AppSettings) => {
    try {
      setLoading(true);
      setError(null);
      await SettingsService.save(newSettings);
      
      // Update local state and timestamp
      setSettings(newSettings);
      setLastFetch(Date.now());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'فشل حفظ الإعدادات';
      setError(errorMessage);
      console.error('Error updating settings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value: SettingsContextType = {
    settings,
    loading,
    error,
    refreshSettings,
    updateSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettingsContext = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
};

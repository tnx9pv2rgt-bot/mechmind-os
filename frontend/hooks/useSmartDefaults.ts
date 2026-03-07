/**
 * Smart Defaults Hook - Geolocalizzazione IP
 */

import { useEffect, useState, useCallback } from 'react';

interface GeoLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  zip: string;
  timezone: string;
}

interface SmartDefaults {
  location: GeoLocation | null;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  language: string;
  timezone: string;
  isLoading: boolean;
  error: string | null;
}

export const useSmartDefaults = () => {
  const [defaults, setDefaults] = useState<SmartDefaults>({
    location: null,
    deviceType: 'desktop',
    language: 'it-IT',
    timezone: 'Europe/Rome',
    isLoading: true,
    error: null
  });

  const detectDeviceType = useCallback((): 'mobile' | 'tablet' | 'desktop' => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }, []);

  const detectLocationFromIP = useCallback(async (): Promise<GeoLocation | null> => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return {
        country: data.country_name || 'Italy',
        countryCode: data.country_code || 'IT',
        region: data.region || '',
        city: data.city || '',
        zip: data.postal || '',
        timezone: data.timezone || 'Europe/Rome'
      };
    } catch (error) {
      console.error('IP Geolocation failed:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const loadDefaults = async () => {
      // Skip API call if CSP blocks it - use browser defaults
      let location = null;
      try {
        location = await detectLocationFromIP();
      } catch {
        // CSP blocked or network error - use defaults
      }
      
      const deviceType = detectDeviceType();
      const language = navigator.language || 'it-IT';
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome';

      setDefaults({
        location,
        deviceType,
        language,
        timezone: location?.timezone || timezone,
        isLoading: false,
        error: null
      });
    };

    loadDefaults();
  }, [detectLocationFromIP, detectDeviceType]);

  return defaults;
};

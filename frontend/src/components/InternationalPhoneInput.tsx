import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, Phone } from 'lucide-react';

export interface CountryInfo {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  placeholder: string;
}

export const COUNTRIES: CountryInfo[] = [
  // Primary / Regional Focus (East Africa & Horn of Africa)
  { code: 'ET', name: 'Ethiopia', dialCode: '+251', flag: '🇪🇹', placeholder: '91 122 3344' },
  { code: 'DJ', name: 'Djibouti', dialCode: '+253', flag: '🇩🇯', placeholder: '77 12 34 56' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪', placeholder: '712 345678' },
  { code: 'SO', name: 'Somalia', dialCode: '+252', flag: '🇸🇴', placeholder: '61 2345678' },
  { code: 'SD', name: 'Sudan', dialCode: '+249', flag: '🇸🇩', placeholder: '91 234 5678' },
  { code: 'SS', name: 'South Sudan', dialCode: '+211', flag: '🇸🇸', placeholder: '92 123 4567' },
  { code: 'ER', name: 'Eritrea', dialCode: '+291', flag: '🇪🇷', placeholder: '7 123456' },
  { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬', placeholder: '712 345678' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255', flag: '🇹🇿', placeholder: '712 345 678' },
  { code: 'RW', name: 'Rwanda', dialCode: '+250', flag: '🇷🇼', placeholder: '788 123 456' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬', placeholder: '10 1234 5678' },

  // Middle East & Gulf (Key Automotive Import & Trading Partners)
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', placeholder: '50 123 4567' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', placeholder: '50 123 4567' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', placeholder: '3312 3456' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', placeholder: '9123 4567' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭', placeholder: '3600 1234' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', placeholder: '9123 4567' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷', placeholder: '501 234 5678' },

  // Asia & Major Vehicle Suppliers
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', placeholder: '138 0013 8000' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', placeholder: '98765 43210' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', placeholder: '90 1234 5678' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', placeholder: '10 1234 5678' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', placeholder: '81 234 5678' },

  // North America & Europe
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', placeholder: '202 555 0199' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', placeholder: '416 555 0199' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', placeholder: '7911 123456' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', placeholder: '151 12345678' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', placeholder: '6 12 34 56 78' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', placeholder: '312 345 6789' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', placeholder: '6 12345678' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪', placeholder: '70 123 45 67' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭', placeholder: '78 123 45 67' },

  // Other African Nations
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', placeholder: '71 123 4567' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬', placeholder: '802 123 4567' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭', placeholder: '23 123 4567' },
];

// Sort countries with Ethiopia first, then East Africa, then alphabetical
const DEFAULT_COUNTRY = COUNTRIES[0]; // Ethiopia

interface InternationalPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  value,
  onChange,
  required = false,
  disabled = false,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(DEFAULT_COUNTRY);
  const [nationalNumber, setNationalNumber] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Parse initial or incoming value
  useEffect(() => {
    if (!value) {
      setNationalNumber('');
      return;
    }

    const clean = value.trim();

    // Check if starts with +
    if (clean.startsWith('+')) {
      // Find matching country by longest dial code prefix
      const sortedByDialLength = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
      const match = sortedByDialLength.find((c) => clean.startsWith(c.dialCode));
      if (match) {
        setSelectedCountry(match);
        setNationalNumber(clean.slice(match.dialCode.length).trim());
        return;
      }
    }

    // If starts with 09 or 07 (Ethiopian local format)
    if (/^0[79]/.test(clean)) {
      setSelectedCountry(DEFAULT_COUNTRY);
      setNationalNumber(clean.slice(1));
      return;
    }

    // Default: assign whatever digits to national number
    setNationalNumber(clean.replace(/^\+/, ''));
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter countries for Telegram-style search
  const filteredCountries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q),
    );
  }, [searchQuery]);

  const handleSelectCountry = (country: CountryInfo) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery('');

    // Emit combined full number
    const cleanNational = nationalNumber.replace(/\D/g, '');
    const combined = cleanNational ? `${country.dialCode}${cleanNational}` : country.dialCode;
    onChange(combined);
  };

  const handleNationalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Auto-detect country if user pastes or types a '+' with dial code
    if (raw.startsWith('+')) {
      const sortedByDialLength = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
      const match = sortedByDialLength.find((c) => raw.startsWith(c.dialCode));
      if (match) {
        setSelectedCountry(match);
        raw = raw.slice(match.dialCode.length);
      }
    }

    // Clean leading zero if Ethiopian and user typed 09...
    let clean = raw.replace(/[^\d\s-]/g, '');
    if (selectedCountry.dialCode === '+251' && clean.startsWith('0')) {
      clean = clean.slice(1);
    }

    setNationalNumber(clean);
    const digitsOnly = clean.replace(/\D/g, '');
    const fullNumber = digitsOnly ? `${selectedCountry.dialCode}${digitsOnly}` : '';
    onChange(fullNumber);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          overflow: 'hidden',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {/* Telegram-style Country Code Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.6rem 0.75rem',
            background: 'rgba(255, 255, 255, 0.04)',
            border: 'none',
            borderRight: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
          title={`Selected: ${selectedCountry.name} (${selectedCountry.dialCode}) — Click to change country`}
        >
          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{selectedCountry.flag}</span>
          <span style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace', fontWeight: 700 }}>
            {selectedCountry.dialCode}
          </span>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)', marginLeft: '0.1rem' }} />
        </button>

        {/* National Number Input */}
        <input
          id={id}
          type="tel"
          disabled={disabled}
          required={required}
          value={nationalNumber}
          onChange={handleNationalNumberChange}
          placeholder={selectedCountry.placeholder}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: '0.6rem 0.85rem',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            fontFamily: 'monospace',
            letterSpacing: '0.03em',
          }}
        />
      </div>

      {/* Live Telegram-style formatted preview badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.35rem',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>
          Country: <strong style={{ color: 'var(--text-secondary)' }}>{selectedCountry.name}</strong>
        </span>
        {nationalNumber.replace(/\D/g, '').length >= 6 && (
          <span style={{ color: 'var(--accent-emerald)', fontFamily: 'monospace', fontWeight: 600 }}>
            ✓ {selectedCountry.dialCode} {nationalNumber.trim()}
          </span>
        )}
      </div>

      {/* Telegram-style Floating Country Picker Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1200,
            width: '320px',
            maxHeight: '340px',
            background: 'var(--bg-primary, #0f172a)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45), 0 4px 10px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Popover Header & Search Input */}
          <div
            style={{
              padding: '0.65rem 0.75rem',
              borderBottom: '1px solid var(--border-color)',
              background: 'rgba(255, 255, 255, 0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.4rem 0.6rem',
              }}
            >
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or code..."
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* Countries List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.35rem',
            }}
          >
            {filteredCountries.length === 0 ? (
              <div style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                No countries found matching "{searchQuery}"
              </div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = selectedCountry.code === c.code;
                return (
                  <button
                    key={`${c.code}-${c.dialCode}`}
                    type="button"
                    onClick={() => handleSelectCountry(c)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.65rem',
                      borderRadius: '6px',
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{c.flag}</span>
                      <span style={{ fontWeight: isSelected ? 700 : 500 }}>{c.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>
                        {c.dialCode}
                      </span>
                      {isSelected && <Check size={14} style={{ color: 'var(--accent-cyan)' }} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

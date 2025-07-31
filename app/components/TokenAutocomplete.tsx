'use client';

import { useState, useEffect, useRef } from 'react';
import { Token } from '../utils/oneinch';

interface TokenAutocompleteProps {
  tokens: Token[];
  selectedToken: Token | null;
  onTokenSelect: (token: Token) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function TokenAutocomplete({
  tokens,
  selectedToken,
  onTokenSelect,
  placeholder = "Search for a token...",
  disabled = false
}: TokenAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter tokens based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Show first 50 tokens from API when no search query
      setFilteredTokens(tokens.slice(0, 50)); // Limit to 50 for performance
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = tokens.filter(token =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
      ).slice(0, 20); // Limit search results to 20
      setFilteredTokens(filtered);
    }
  }, [searchQuery, tokens]);

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true);
    setSearchQuery('');
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
  };

  // Handle token selection
  const handleTokenSelect = (token: Token) => {
    onTokenSelect(token);
    setIsOpen(false);
    setSearchQuery('');
    inputRef.current?.blur();
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get display value for input
  const getDisplayValue = () => {
    if (isOpen && searchQuery) {
      return searchQuery;
    }
    return selectedToken ? `${selectedToken.symbol} - ${selectedToken.name}` : '';
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={getDisplayValue()}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        autoComplete="off"
      />

      {/* Token dropdown */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredTokens.length > 0 ? (
            <>
              {filteredTokens.map((token) => (
                <button
                  key={token.address}
                  onClick={() => handleTokenSelect(token)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    {token.logoURI && (
                      <img
                        src={token.logoURI}
                        alt={token.symbol}
                        className="w-6 h-6 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {token.symbol}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {token.name}
                        </span>
                      </div>
                      {searchQuery && token.address.toLowerCase().includes(searchQuery.toLowerCase()) && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">
                          {token.address}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {filteredTokens.length === 20 && (
                <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 text-center bg-gray-50 dark:bg-gray-700">
                  Showing first 20 results. Type to narrow down...
                </div>
              )}
            </>
          ) : (
            <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
              {searchQuery ? `No tokens found for "${searchQuery}"` : 'No tokens available'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { createContext, useState, useContext } from 'react';

interface FilterContextType {
  showUntagged: boolean
  showPin: boolean
  keyValueMap: Record<string, { enabled: boolean; color: string; }>;
  updateValue: (key: string, enabled: boolean, color: string) => void
  addValue: (key: string, enabled: boolean, color: string) => void
}
const FiltersContext = createContext<FilterContextType>({
  showUntagged: false,
  showPin: false,
  keyValueMap: {},
  updateValue: () => {},
  addValue: () => {},
});

export default FiltersContext

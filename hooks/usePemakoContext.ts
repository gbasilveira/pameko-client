import { useContext } from 'react';
import { PemakoContext } from '../context/PemakoContext';
import { PemakoContextValue } from '../types';

// Custom hook to use the Pemako context
export const usePemakoContext = (): PemakoContextValue => {
  const context = useContext(PemakoContext);
  if (context === undefined) {
    throw new Error('usePemakoContext must be used within a PemakoProvider');
  }
  return context;
}; 
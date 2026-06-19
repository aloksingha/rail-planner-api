import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import RootApp from './App.tsx'

// Clear booking persistence on page reload/refresh
try {
  [
    'tp_trainNo', 'tp_selectedTrainName', 'tp_trainClass', 'tp_source', 
    'tp_destination', 'tp_sourceSearch', 'tp_destinationSearch', 
    'tp_journeyDate', 'tp_mobile', 'tp_email', 'tp_passengers', 
    'tp_selectedUnitPrice', 'tp_couponCode', 'tp_appliedCoupon'
  ].forEach(key => localStorage.removeItem(key));
} catch (e) {
  console.error('Failed to clear persistence', e);
}


// Global recovery for ChunkLoadErrors (caused by stale browser cache of index.html)
window.addEventListener('error', (e) => {
  if (e.message?.includes('Failed to load module script') || e.message?.includes('ChunkLoadError')) {
    console.warn('Stale asset detected. Performing hard recovery...');
    window.location.reload();
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.name === 'ChunkLoadError' || e.reason?.message?.includes('Loading chunk')) {
    console.warn('Asset resolution failed. Refreshing source...');
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)

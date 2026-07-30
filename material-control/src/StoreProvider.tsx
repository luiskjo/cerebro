import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { Area, AppState, Material, Vendor } from './types';
import { loadState, reducer, saveState, type Action } from './store';
import {
  buildAlerts,
  buildMatchProposals,
  buildSubstitutionSuggestions,
  findDuplicateCandidates,
  findOrphans,
  materialDeliveryProgress,
  orderBalances,
  rollupAreas,
  rollupDrops,
  rollupMaterials,
  summarize,
  vendorBalances,
  type Alert,
  type AreaRollup,
  type DropRollup,
  type DuplicateSuggestion,
  type MatchProposal,
  type MaterialDeliveryProgress,
  type MaterialRollup,
  type OrderBalance,
  type OrphanSuggestion,
  type ProjectSummary,
  type SubstitutionSuggestion,
  type VendorBalance,
} from './engine';

interface ContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  rollups: MaterialRollup[];
  areaRollups: AreaRollup[];
  dropRollups: DropRollup[];
  deliveryProgress: MaterialDeliveryProgress[];
  proposals: MatchProposal[];
  duplicates: DuplicateSuggestion[];
  orphans: OrphanSuggestion[];
  substitutions: SubstitutionSuggestion[];
  orderBalances: OrderBalance[];
  vendorBalances: VendorBalance[];
  summary: ProjectSummary;
  alerts: Alert[];
  materialById: Map<string, Material>;
  areaById: Map<string, Area>;
  vendorById: Map<string, Vendor>;
}

const StoreContext = createContext<ContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const value = useMemo<ContextValue>(() => {
    const rollups = rollupMaterials(state);
    const proposals = buildMatchProposals(state);
    const dropRollups = rollupDrops(state);
    const orphans = findOrphans(state);
    const substitutions = buildSubstitutionSuggestions(state, rollups);
    const vendors = vendorBalances(state);

    return {
      state,
      dispatch,
      rollups,
      areaRollups: rollupAreas(state),
      dropRollups,
      deliveryProgress: materialDeliveryProgress(state),
      proposals,
      duplicates: findDuplicateCandidates(state),
      orphans,
      substitutions,
      orderBalances: orderBalances(state),
      vendorBalances: vendors,
      summary: summarize(state, rollups, proposals.length),
      alerts: buildAlerts({
        state,
        rollups,
        dropRollups,
        proposals,
        orphans,
        substitutions,
        vendorBalances: vendors,
      }),
      materialById: new Map(state.materials.map((m) => [m.id, m])),
      areaById: new Map(state.areas.map((a) => [a.id, a])),
      vendorById: new Map(state.vendors.map((v) => [v.id, v])),
    };
  }, [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): ContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside a StoreProvider');
  return ctx;
}

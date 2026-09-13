/**
 * ─── APPLICATION STORE ───────────────────────────────────────────────────────
 * A single store for the whole application, backed by Supabase.
 *
 * Every ledger below is held in React state exactly as before — which is why
 * the actions still compute stock deltas, debt allocations and melt losses in
 * memory — but each collection is mirrored to its table by `useSynced`, so a
 * change made here is a row written there. See `src/lib/repository.ts` for the
 * column mapping and `supabase/` for the schema itself.
 *
 * Terminology note: what used to be "silver types" is now *metal types*. Each
 * one belongs to a *metal category* (Or, Argent, or any category the user
 * creates), which is what makes the app metal-agnostic.
 */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  User, Language, MetalCategory, MetalType, Supplier, PurchaseInvoice, SaleInvoice,
  Workshop, Command, Worker, WorkerAdvance, WorkerAbsence, WorkerPaymentRecord,
  Delivery, StoreExpense, PaymentAction, Debt, DebtPayment, ReplacementInvoice,
  CassiePurchase, MeltingRecord, WebOffer, WebSpecialOffer, WebDeliveryCompany,
  WebContacts, WebOrder, Client, ClientPayment, ClientRecuperation, StoreSettings,
} from '../types';
import { DEMO_DATASET } from '../data/demoData';
import { supabase } from '../lib/supabase';
import {
  useSynced, useSyncedList, useSyncedSettings, useSyncedContacts,
  setSyncErrorHandler, flushSync,
} from '../lib/useSynced';
import * as repo from '../lib/repository';
import {
  adminExists as rpcAdminExists, bootstrapAdmin, signIn as authSignIn,
  signOut as authSignOut, fetchProfile, fetchMyPermissions, profileToUser,
  authErrorMessage,
} from '../lib/auth';

interface AppState {
  user: User | null;
  language: Language;

  // ── Catalogue ──────────────────────────────────────────────
  metalCategories: MetalCategory[];
  metalTypes: MetalType[];
  shapes: string[];
  calibres: string[];
  /** Category names — convenience list for selects. */
  metals: string[];

  // ── Ledgers ────────────────────────────────────────────────
  suppliers: Supplier[];
  purchases: PurchaseInvoice[];
  sales: SaleInvoice[];
  workshops: Workshop[];
  commands: Command[];
  workers: Worker[];
  workerAdvances: WorkerAdvance[];
  workerAbsences: WorkerAbsence[];
  workerPayments: WorkerPaymentRecord[];
  deliveries: Delivery[];
  storeExpenses: StoreExpense[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  clients: Client[];
  replacements: ReplacementInvoice[];
  cassiePurchases: CassiePurchase[];
  meltings: MeltingRecord[];

  minimalWeight: number;
  settings: StoreSettings;

  setUser: (user: User | null) => void;
  setLanguage: (lang: Language) => void;

  // ── Metal categories ───────────────────────────────────────
  addMetalCategory: (c: Omit<MetalCategory, 'id'>) => Promise<void>;
  updateMetalCategory: (id: string, c: Partial<MetalCategory>) => Promise<void>;
  deleteMetalCategory: (id: string) => Promise<void>;
  /** Reference buy price (DZD/g) for the category a stock type belongs to. */
  metalPriceFor: (metalTypeId?: string) => number;
  categoryOf: (metalTypeId?: string) => MetalCategory | undefined;
  categoryLabel: (metalTypeId?: string) => string;

  addMetalType: (mt: Omit<MetalType, 'id'>) => Promise<void>;
  updateMetalType: (id: string, mt: Partial<MetalType>) => Promise<void>;
  deleteMetalType: (id: string) => Promise<void>;

  addSupplier: (s: Omit<Supplier, 'id'>) => Promise<void>;
  updateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  addPurchase: (p: Omit<PurchaseInvoice, 'id'>) => Promise<void>;
  updatePurchase: (id: string, p: Partial<PurchaseInvoice>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;

  addSale: (s: Omit<SaleInvoice, 'id'>) => Promise<void>;
  updateSale: (id: string, s: Partial<SaleInvoice>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;

  addWorkshop: (w: Omit<Workshop, 'id'>) => Promise<void>;
  updateWorkshop: (id: string, w: Partial<Workshop>) => Promise<void>;
  deleteWorkshop: (id: string) => Promise<void>;

  addCommand: (c: Omit<Command, 'id'>) => Promise<void>;
  updateCommand: (id: string, c: Partial<Command>) => Promise<void>;
  deleteCommand: (id: string) => Promise<void>;

  addWorker: (w: Omit<Worker, 'id'>) => Promise<void>;
  updateWorker: (id: string, w: Partial<Worker>) => Promise<void>;
  deleteWorker: (id: string) => Promise<void>;

  addAdvance: (a: Omit<WorkerAdvance, 'id'>) => Promise<void>;
  addAbsence: (a: Omit<WorkerAbsence, 'id'>) => Promise<void>;
  addWorkerPayment: (p: Omit<WorkerPaymentRecord, 'id'>) => Promise<void>;

  addDelivery: (d: Omit<Delivery, 'id'>) => Promise<void>;
  updateDelivery: (id: string, d: Partial<Delivery>) => Promise<void>;
  deleteDelivery: (id: string) => Promise<void>;
  addPaymentAction: (deliveryId: string, p: Omit<PaymentAction, 'id'>) => Promise<void>;
  deletePaymentAction: (deliveryId: string, paymentId: string) => Promise<void>;

  addStoreExpense: (e: Omit<StoreExpense, 'id'>) => Promise<void>;
  updateStoreExpense: (id: string, e: Partial<StoreExpense>) => Promise<void>;
  deleteStoreExpense: (id: string) => Promise<void>;

  addClient: (c: Omit<Client, 'id' | 'payments'>) => Promise<void>;
  updateClient: (id: string, c: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addClientPayment: (clientId: string, p: Omit<ClientPayment, 'id'>) => Promise<void>;
  updateClientPayment: (clientId: string, paymentId: string, p: Partial<ClientPayment>) => Promise<void>;
  deleteClientPayment: (clientId: string, paymentId: string) => Promise<void>;
  addClientRecuperation: (clientId: string, r: Omit<ClientRecuperation, 'id'>) => Promise<void>;
  updateClientRecuperation: (clientId: string, recuperationId: string, r: Partial<ClientRecuperation>) => Promise<void>;
  deleteClientRecuperation: (clientId: string, recuperationId: string) => Promise<void>;

  addReplacement: (r: Omit<ReplacementInvoice, 'id' | 'date' | 'amountDifference' | 'amountToPay' | 'amountToRefund'>) => Promise<void>;
  updateReplacement: (id: string, r: Partial<ReplacementInvoice>) => Promise<void>;
  deleteReplacement: (id: string) => Promise<void>;

  addDebt: (d: Omit<Debt, 'id' | 'date' | 'amountPaid' | 'remaining' | 'isPaid'>) => Promise<void>;
  updateDebt: (id: string, d: Partial<Debt>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  payDebt: (id: string, amount: number) => Promise<void>;

  addDebtPayment: (p: Omit<DebtPayment, 'id' | 'createdAt'>) => Promise<string>;
  updateDebtPayment: (id: string, p: Partial<DebtPayment>) => Promise<void>;
  deleteDebtPayment: (id: string) => Promise<void>;

  addCassiePurchase: (cp: Omit<CassiePurchase, 'id' | 'date' | 'isMelted'>) => Promise<void>;
  updateCassiePurchase: (id: string, cp: Partial<CassiePurchase>) => Promise<void>;
  deleteCassiePurchase: (id: string) => Promise<void>;
  meltCassiePurchases: (purchaseIds: string[], postWeight: number, targetMetalTypeId: string) => Promise<void>;
  deleteMeltingRecord: (id: string) => Promise<void>;
  updateMeltingRecord: (id: string, postWeight: number, targetMetalTypeId: string) => Promise<void>;

  addShape: (name: string) => Promise<void>;
  updateShape: (oldName: string, newName: string) => Promise<void>;
  deleteShape: (name: string) => Promise<void>;

  addCalibre: (calibre: string) => Promise<void>;
  deleteCalibre: (calibre: string) => Promise<void>;

  /** Creates a metal category from a bare name (used by the Commands screen). */
  addMetal: (metal: string) => Promise<void>;
  deleteMetal: (metal: string) => Promise<void>;

  setMinimalWeight: (weight: number) => Promise<void>;
  updateSettings: (s: Partial<StoreSettings>) => Promise<void>;

  webOffers: WebOffer[];
  addWebOffer: (o: Omit<WebOffer, 'id' | 'createdAt'>) => Promise<void>;
  updateWebOffer: (id: string, o: Partial<WebOffer>) => Promise<void>;
  deleteWebOffer: (id: string) => Promise<void>;

  webSpecialOffers: WebSpecialOffer[];
  addWebSpecialOffer: (o: Omit<WebSpecialOffer, 'id' | 'createdAt'>) => Promise<void>;
  updateWebSpecialOffer: (id: string, o: Partial<WebSpecialOffer>) => Promise<void>;
  deleteWebSpecialOffer: (id: string) => Promise<void>;

  webDeliveryCompanies: WebDeliveryCompany[];
  addWebDeliveryCompany: (c: Omit<WebDeliveryCompany, 'id'>) => Promise<void>;
  updateWebDeliveryCompany: (id: string, c: Partial<WebDeliveryCompany>) => Promise<void>;
  deleteWebDeliveryCompany: (id: string) => Promise<void>;

  webContacts: WebContacts;
  updateWebContacts: (c: Partial<WebContacts>) => Promise<void>;

  webOrders: WebOrder[];
  addWebOrder: (o: Omit<WebOrder, 'id' | 'createdAt' | 'orderNumber' | 'status'>) => Promise<string>;
  updateWebOrder: (id: string, o: Partial<WebOrder>) => Promise<void>;
  deleteWebOrder: (id: string) => Promise<void>;
  finalizeWebOrder: (id: string) => Promise<void>;
  cancelWebOrder: (id: string, recoverStock?: boolean) => Promise<void>;

  /** Snapshot of every ledger — used by the local backup / restore screen. */
  exportSnapshot: () => Record<string, any>;
  importSnapshot: (snapshot: Record<string, any>) => void;
  resetDemoData: () => void;

  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;

  isLoading: boolean;

  // ── Authentication & permissions ───────────────────────────
  /** Permission keys the signed-in user holds (an admin holds every one). */
  permissions: string[];
  /** Is this button / screen allowed? The sidebar and every action button ask this. */
  can: (permissionKey: string) => boolean;
  /** True until the first permission load finishes, so nothing flashes. */
  isAuthReady: boolean;
  /** False only on a brand-new project — drives the "create admin" button. */
  hasAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createAdminAccount: (email: string, password: string, username: string) => Promise<void>;
  refreshAdminExists: () => Promise<void>;
  reloadPermissions: () => Promise<void>;
  /** Re-reads the workers table — the Employés screen calls this after an RPC
   *  creates or deletes an account server side. */
  reloadWorkers: () => Promise<void>;
  /** Last connection / write error, surfaced as a banner. */
  syncError: string | null;
  clearSyncError: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

/** Monotonic id generator — avoids collisions when several rows are created in the same millisecond. */
let idCounter = 0;
const newId = (prefix = ''): string => {
  idCounter += 1;
  return `${prefix}${Date.now()}${idCounter.toString().padStart(3, '0')}`;
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── Session ──────────────────────────────────────────────────────────────
  // The user is whoever Supabase says is signed in; there is no local account.
  const [user, setUserState] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [hasAdmin, setHasAdmin] = useState(true);       // assume yes until told otherwise
  const [syncError, setSyncError] = useState<string | null>(null);

  const [language, setLanguage] = useState<Language>(
    () => (localStorage.getItem('language') as Language) || 'fr'
  );

  const [theme, setThemeState] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('theme') as 'dark' | 'light') || 'light'
  );

  const setTheme = (t: 'dark' | 'light') => {
    setThemeState(t);
    localStorage.setItem('theme', t);
    document.documentElement.setAttribute('data-theme', t);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem('language', language); }, [language]);

  // ── Ledgers, mirrored to Supabase ────────────────────────────────────────
  // `live` gates the mirror: nothing is written back until the first load has
  // finished, so hydrating the store never echoes straight back to the server.
  const [live, setLive] = useState(false);

  const [metalCategories, setMetalCategories, hydrateMetalCategories] = useSynced<MetalCategory>(repo.metalCategoryMapper, live);
  const [metalTypes, setMetalTypes, hydrateMetalTypes]               = useSynced<MetalType>(repo.metalTypeMapper, live);
  const [shapes, setShapes, hydrateShapes]                           = useSyncedList('shapes', 'name', live);
  const [calibres, setCalibresList, hydrateCalibres]                 = useSyncedList('calibres', 'value', live);
  const [suppliers, setSuppliers, hydrateSuppliers]                  = useSynced<Supplier>(repo.supplierMapper, live);
  const [purchases, setPurchases, hydratePurchases]                  = useSynced<PurchaseInvoice>(repo.purchaseMapper, live);
  const [sales, setSales, hydrateSales]                              = useSynced<SaleInvoice>(repo.saleMapper, live);
  const [workshops, setWorkshops, hydrateWorkshops]                  = useSynced<Workshop>(repo.workshopMapper, live);
  // Declared before commands and replacements on purpose: both carry a
  // delivery_id, and the mirror flushes collections in hook order, so a parent
  // row is always written before anything that points at it.
  const [deliveries, setDeliveries, hydrateDeliveries]               = useSynced<Delivery>(repo.deliveryMapper, live);
  const [commands, setCommands, hydrateCommands]                     = useSynced<Command>(repo.commandMapper, live);
  const [workers, setWorkers, hydrateWorkers]                        = useSynced<Worker>(repo.workerMapper, live);
  const [workerAdvances, setWorkerAdvances, hydrateAdvances]         = useSynced<WorkerAdvance>(repo.workerAdvanceMapper, live);
  const [workerAbsences, setWorkerAbsences, hydrateAbsences]         = useSynced<WorkerAbsence>(repo.workerAbsenceMapper, live);
  const [workerPayments, setWorkerPayments, hydrateWorkerPayments]   = useSynced<WorkerPaymentRecord>(repo.workerPaymentMapper, live);
  const [storeExpenses, setStoreExpenses, hydrateExpenses]           = useSynced<StoreExpense>(repo.storeExpenseMapper, live);
  const [cassiePurchases, setCassiePurchases, hydrateCassie]         = useSynced<CassiePurchase>(repo.cassiePurchaseMapper, live);
  const [meltings, setMeltings, hydrateMeltings]                     = useSynced<MeltingRecord>(repo.meltingMapper, live);
  const [debts, setDebts, hydrateDebts]                              = useSynced<Debt>(repo.debtMapper, live);
  const [debtPayments, setDebtPayments, hydrateDebtPayments]         = useSynced<DebtPayment>(repo.debtPaymentMapper, live);
  const [replacements, setReplacements, hydrateReplacements]         = useSynced<ReplacementInvoice>(repo.replacementMapper, live);
  const [clients, setClients, hydrateClients]                        = useSynced<Client>(repo.clientMapper, live);
  const [webOffers, setWebOffers, hydrateWebOffers]                  = useSynced<WebOffer>(repo.webOfferMapper, live);
  const [webSpecialOffers, setWebSpecialOffers, hydrateSpecialOffers]= useSynced<WebSpecialOffer>(repo.webSpecialOfferMapper, live);
  const [webDeliveryCompanies, setWebDeliveryCompanies, hydrateDelCos] = useSynced<WebDeliveryCompany>(repo.webDeliveryCompanyMapper, live);
  const [webOrders, setWebOrders, hydrateWebOrders]                  = useSynced<WebOrder>(repo.webOrderMapper, live);

  const {
    settings, setSettings,
    minimalWeight, setMinimalWeight: setMinimalWeightState,
    hydrate: hydrateSettings,
  } = useSyncedSettings(DEMO_DATASET.settings, DEMO_DATASET.minimalWeight, live);

  const [webContacts, setWebContacts, hydrateWebContacts] = useSyncedContacts({}, live);

  const [isLoading, setIsLoading] = useState(true);

  // ══ AUTHENTICATION ═══════════════════════════════════════════════════════

  const can = useCallback(
    (key: string) => user?.role === 'admin' || permissions.includes(key),
    [user, permissions]
  );

  const refreshAdminExists = useCallback(async () => {
    try { setHasAdmin(await rpcAdminExists()); }
    catch (e) { setSyncError(authErrorMessage(e, language)); }
  }, [language]);

  const reloadPermissions = useCallback(async () => {
    try { setPermissions(await fetchMyPermissions()); }
    catch (e) { console.error('[permissions]', e); }
  }, []);

  const reloadWorkers = useCallback(async () => {
    try { hydrateWorkers(await repo.fetchAll(repo.workerMapper)); }
    catch (e) { console.error('[workers]', e); }
  }, [hydrateWorkers]);

  /** Reads the profile behind a session and publishes it as the current user. */
  const adoptSession = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setUserState(null);
      setPermissions([]);
      setLive(false);
      return;
    }
    try {
      const profile = await fetchProfile(userId);
      if (!profile || !profile.isActive) {
        await authSignOut();
        setUserState(null);
        setPermissions([]);
        return;
      }
      setUserState(profileToUser(profile, language));
      setPermissions(await fetchMyPermissions());
    } catch (e) {
      setSyncError(authErrorMessage(e, language));
      setUserState(null);
    }
  }, [language]);

  // Boot: adopt any stored session, and find out whether this shop has an admin.
  useEffect(() => {
    let cancelled = false;
    setSyncErrorHandler(e => setSyncError(authErrorMessage(e, language)));

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      await adoptSession(data.session?.user?.id);
      if (cancelled) return;
      if (!data.session) await refreshAdminExists();
      if (!cancelled) setIsAuthReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUserState(null);
        setPermissions([]);
        setLive(false);
        refreshAdminExists();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        adoptSession(session?.user?.id);
      }
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await authSignIn(email, password);
    const { data } = await supabase.auth.getSession();
    await adoptSession(data.session?.user?.id);
  }, [adoptSession]);

  const signOut = useCallback(async () => {
    await flushSync();               // never drop a pending write on the way out
    setLive(false);
    await authSignOut();
    setUserState(null);
    setPermissions([]);
    localStorage.removeItem('activeTab');
    await refreshAdminExists();
  }, [refreshAdminExists]);

  const createAdminAccount = useCallback(async (email: string, password: string, username: string) => {
    await bootstrapAdmin(email, password, username);
    setHasAdmin(true);
    const { data } = await supabase.auth.getSession();
    await adoptSession(data.session?.user?.id);
  }, [adoptSession]);

  /** `setUser(null)` is how the sidebar logs out — keep that contract. */
  const setUser = useCallback((next: User | null) => {
    if (next === null) { void signOut(); return; }
    setUserState(next);
  }, [signOut]);

  // ══ DATA LOADING ═════════════════════════════════════════════════════════
  // Staff load every ledger they are allowed to read; the public storefront
  // loads only the handful of tables anonymous visitors may see.

  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthReady) return;

    const key = user ? `user:${user.id}` : 'public';
    if (loadedFor.current === key) return;
    loadedFor.current = key;

    let cancelled = false;

    /** Reads one table, tolerating "not allowed" so a missing screen is simply empty. */
    const load = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); }
      catch (e: any) {
        const msg = String(e?.message || '');
        if (/permission denied|row-level security|does not exist/i.test(msg)) return fallback;
        throw e;
      }
    };

    (async () => {
      setIsLoading(true);
      setLive(false);
      try {
        if (user) {
          const [
            cats, types, shp, cal, sup, pur, sal, wsh, cmd, wrk,
            adv, abs, wpay, del, exp, cas, mlt, dbt, dpay, rep, cli,
            offers, specials, delCos, orders, stg, contacts,
          ] = await Promise.all([
            load(() => repo.fetchAll(repo.metalCategoryMapper), []),
            load(() => repo.fetchAll(repo.metalTypeMapper), []),
            load(() => repo.fetchValueList('shapes', 'name', 'sort_order'), []),
            load(() => repo.fetchValueList('calibres', 'value'), []),
            load(() => repo.fetchAll(repo.supplierMapper), []),
            load(() => repo.fetchAll(repo.purchaseMapper), []),
            load(() => repo.fetchAll(repo.saleMapper), []),
            load(() => repo.fetchAll(repo.workshopMapper), []),
            load(() => repo.fetchAll(repo.commandMapper), []),
            load(() => repo.fetchAll(repo.workerMapper), []),
            load(() => repo.fetchAll(repo.workerAdvanceMapper), []),
            load(() => repo.fetchAll(repo.workerAbsenceMapper), []),
            load(() => repo.fetchAll(repo.workerPaymentMapper), []),
            load(() => repo.fetchAll(repo.deliveryMapper), []),
            load(() => repo.fetchAll(repo.storeExpenseMapper), []),
            load(() => repo.fetchAll(repo.cassiePurchaseMapper), []),
            load(() => repo.fetchAll(repo.meltingMapper), []),
            load(() => repo.fetchAll(repo.debtMapper), []),
            load(() => repo.fetchAll(repo.debtPaymentMapper), []),
            load(() => repo.fetchAll(repo.replacementMapper), []),
            load(() => repo.fetchAll(repo.clientMapper), []),
            load(() => repo.fetchAll(repo.webOfferMapper), []),
            load(() => repo.fetchAll(repo.webSpecialOfferMapper), []),
            load(() => repo.fetchAll(repo.webDeliveryCompanyMapper), []),
            load(() => repo.fetchAll(repo.webOrderMapper), []),
            load(() => repo.fetchSettings(), null),
            load(() => repo.fetchWebContacts(), null),
          ]);
          if (cancelled) return;

          hydrateMetalCategories(cats);   hydrateMetalTypes(types);
          hydrateShapes(shp);             hydrateCalibres(cal);
          hydrateSuppliers(sup);          hydratePurchases(pur);
          hydrateSales(sal);              hydrateWorkshops(wsh);
          hydrateCommands(cmd);           hydrateWorkers(wrk);
          hydrateAdvances(adv);           hydrateAbsences(abs);
          hydrateWorkerPayments(wpay);    hydrateDeliveries(del);
          hydrateExpenses(exp);           hydrateCassie(cas);
          hydrateMeltings(mlt);           hydrateDebts(dbt);
          hydrateDebtPayments(dpay);      hydrateReplacements(rep);
          hydrateClients(cli);            hydrateWebOffers(offers);
          hydrateSpecialOffers(specials); hydrateDelCos(delCos);
          hydrateWebOrders(orders);
          if (stg) hydrateSettings(stg.settings, stg.minimalWeight);
          if (contacts) hydrateWebContacts(contacts);
        } else {
          // Anonymous storefront: published offers, tariffs and shop identity.
          const [offers, specials, delCos, stg, contacts, cats, types] = await Promise.all([
            load(() => repo.fetchAll(repo.webOfferMapper), []),
            load(() => repo.fetchAll(repo.webSpecialOfferMapper), []),
            load(() => repo.fetchAll(repo.webDeliveryCompanyMapper), []),
            load(() => repo.fetchSettings(), null),
            load(() => repo.fetchWebContacts(), null),
            load(() => repo.fetchPublicCategories(), []),
            load(() => repo.fetchPublicMetalTypes(), []),
          ]);
          if (cancelled) return;

          hydrateWebOffers(offers);
          hydrateSpecialOffers(specials);
          hydrateDelCos(delCos);
          hydrateMetalCategories(cats);
          hydrateMetalTypes(types);
          if (stg) hydrateSettings(stg.settings, stg.minimalWeight);
          if (contacts) hydrateWebContacts(contacts);
        }
      } catch (e) {
        if (!cancelled) setSyncError(authErrorMessage(e, language));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          if (user) setLive(true);     // visitors never write back
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady, user?.id]);

  // ── Category helpers ─────────────────────────────────────────────────────
  const metals = useMemo(() => metalCategories.map(c => c.name), [metalCategories]);

  const categoryOf = (metalTypeId?: string): MetalCategory | undefined => {
    if (!metalTypeId) return undefined;
    const mt = metalTypes.find(t => t.id === metalTypeId);
    if (!mt) return undefined;
    return metalCategories.find(c => c.id === mt.metalCategoryId);
  };

  const categoryLabel = (metalTypeId?: string): string => {
    const cat = categoryOf(metalTypeId);
    if (!cat) return '';
    return language === 'ar' ? (cat.nameAr || cat.name) : cat.name;
  };

  const metalPriceFor = (metalTypeId?: string): number => Number(categoryOf(metalTypeId)?.pricePerGram || 0);

  // ── METAL CATEGORIES ─────────────────────────────────────────────────────
  const addMetalCategory = async (c: Omit<MetalCategory, 'id'>) => {
    const id = newId('cat-');
    setMetalCategories(prev => [...prev, { ...c, id }]);
    if (c.calibres?.length) {
      setCalibresList(prev => Array.from(new Set([...prev, ...c.calibres])));
    }
  };

  const updateMetalCategory = async (id: string, c: Partial<MetalCategory>) => {
    setMetalCategories(prev => prev.map(item => item.id === id ? { ...item, ...c } : item));
    if (c.calibres?.length) {
      setCalibresList(prev => Array.from(new Set([...prev, ...c.calibres!])));
    }
  };

  const deleteMetalCategory = async (id: string) => {
    const cat = metalCategories.find(c => c.id === id);
    if (!cat || cat.isBuiltIn) return;               // built-ins are permanent
    if (metalTypes.some(mt => mt.metalCategoryId === id)) return; // still in use
    setMetalCategories(prev => prev.filter(c => c.id !== id));
  };

  // Legacy string-list API kept for the Commands screen.
  const addMetal = async (metal: string) => {
    const name = metal.trim();
    if (!name || metalCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
    await addMetalCategory({ name, nameAr: name, color: '#8FA0B4', calibres: [], pricePerGram: 0 });
  };

  const deleteMetal = async (metal: string) => {
    const cat = metalCategories.find(c => c.name === metal);
    if (cat) await deleteMetalCategory(cat.id);
  };

  // ── METAL TYPES ──────────────────────────────────────────────────────────
  const addMetalType = async (mt: Omit<MetalType, 'id'>) => {
    const id = newId('mt-');
    setMetalTypes(prev => [...prev, { ...mt, id } as MetalType]);
  };

  const updateMetalType = async (id: string, mt: Partial<MetalType>) => {
    setMetalTypes(prev => prev.map(item => item.id === id ? { ...item, ...mt } : item));
  };

  const deleteMetalType = async (id: string) => {
    setMetalTypes(prev => prev.filter(item => item.id !== id));
  };

  // ── SUPPLIERS ────────────────────────────────────────────────────────────
  const addSupplier = async (s: Omit<Supplier, 'id'>) => {
    setSuppliers(prev => [...prev, { id: newId('sup-'), name: s.name, phone: s.phone ?? '', address: s.address ?? '' }]);
  };
  const updateSupplier = async (id: string, s: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(item => item.id === id ? { ...item, ...s } : item));
  };
  const deleteSupplier = async (id: string) => {
    setSuppliers(prev => prev.filter(item => item.id !== id));
  };

  // ── PURCHASES ────────────────────────────────────────────────────────────
  /** Applies an invoice line to a working copy of the stock. */
  const applyStockDelta = (
    stock: MetalType[],
    metalTypeId: string,
    shape: string | undefined,
    weight: number,
    quantity: number,
    sign: 1 | -1
  ): MetalType[] => {
    const idx = stock.findIndex(mt => mt.id === metalTypeId);
    if (idx === -1) return stock;
    const next = [...stock];
    const mt = next[idx];
    const bounded = (n: number) => Math.max(0, n);

    if (mt.isAlaPiece && shape) {
      const ns = { ...(mt.shapes || {}) } as Record<string, number>;
      ns[shape] = bounded((Number(ns[shape]) || 0) + sign * quantity);
      next[idx] = { ...mt, shapes: ns };
    } else if (mt.isCassie) {
      next[idx] = { ...mt, initialQuantity: bounded(Number(mt.initialQuantity || 0) + sign * weight) };
    } else if (shape) {
      const ns = { ...(mt.shapes || {}) } as Record<string, number>;
      ns[shape] = bounded((Number(ns[shape]) || 0) + sign * weight);
      next[idx] = { ...mt, shapes: ns };
    } else {
      next[idx] = { ...mt, initialQuantity: bounded(Number(mt.initialQuantity || 0) + sign * weight) };
    }
    return next;
  };

  const addPurchase = async (p: Omit<PurchaseInvoice, 'id'>) => {
    const id = newId('pi-');
    const invoiceTotal = p.items.reduce((a, b) => a + (b.totalPrice || 0), 0);
    const paid = (p.amountPaid !== undefined && p.amountPaid !== null) ? p.amountPaid : (p.payment?.total || 0);
    const remaining = Math.max(0, invoiceTotal - paid);

    let next = metalTypes.map(mt => ({ ...mt, shapes: { ...(mt.shapes || {}) } }));
    p.items.forEach(item => {
      next = applyStockDelta(
        next, item.metalTypeId, item.shape as string | undefined,
        Number(item.weight) || 0, Number((item as any).quantity) || 0, 1
      );
    });

    // Scrap ("cassie") handed over as part of the payment leaves the stock.
    const cassieSilver = Number(p.payment?.cassieSilverGrams) || 0;
    const cassieGold = Number(p.payment?.cassieGoldGrams) || 0;
    const deductCassie = (typeId: string | undefined, grams: number, fallbackCategory: string) => {
      if (grams <= 0) return;
      const target = typeId
        ? next.find(mt => mt.id === typeId)
        : next.find(mt => mt.isCassie && mt.metalCategoryId === fallbackCategory);
      if (!target) return;
      next = next.map(mt => mt.id === target.id
        ? { ...mt, initialQuantity: Math.max(0, Number(mt.initialQuantity || 0) - grams) }
        : mt);
    };
    deductCassie((p.payment as any)?.cassieSilverTypeId, cassieSilver, 'argent');
    deductCassie((p.payment as any)?.cassieGoldTypeId, cassieGold, 'or');

    setPurchases(prev => [...prev, { ...p, id, amountPaid: paid, remaining, isDebt: remaining > 0 }]);
    setMetalTypes(next);
  };

  const updatePurchase = async (id: string, p: Partial<PurchaseInvoice>) => {
    setPurchases(prev => prev.map(item => item.id === id ? { ...item, ...p } : item));
  };

  const deletePurchase = async (id: string) => {
    setPurchases(prev => prev.filter(item => item.id !== id));
  };

  // ── SALES ────────────────────────────────────────────────────────────────
  const addSale = async (s: Omit<SaleInvoice, 'id'>) => {
    const id = newId('si-');
    let next = metalTypes.map(mt => ({ ...mt, shapes: { ...(mt.shapes || {}) } }));
    s.items.forEach(item => {
      next = applyStockDelta(
        next, item.metalTypeId, item.shape as string | undefined,
        Number(item.weight) || 0, Number((item as any).quantity) || 0, -1
      );
    });
    setSales(prev => [...prev, { ...s, id }]);
    setMetalTypes(next);
  };

  const updateSale = async (id: string, s: Partial<SaleInvoice>) => {
    setSales(prev => prev.map(item => item.id === id ? { ...item, ...s } : item));
  };

  const deleteSale = async (id: string) => {
    setSales(prev => prev.filter(item => item.id !== id));
  };

  // ── WORKSHOPS ────────────────────────────────────────────────────────────
  const addWorkshop = async (w: Omit<Workshop, 'id'>) => {
    setWorkshops(prev => [...prev, { id: newId('ws-'), name: w.name, phone: w.phone || '', address: w.address || '' }]);
  };
  const updateWorkshop = async (id: string, w: Partial<Workshop>) => {
    setWorkshops(prev => prev.map(item => item.id === id ? { ...item, ...w } : item));
  };
  const deleteWorkshop = async (id: string) => {
    setWorkshops(prev => prev.filter(item => item.id !== id));
  };

  // ── WORKSHOP COMMANDS ────────────────────────────────────────────────────
  const addCommand = async (c: Omit<Command, 'id'>) => {
    const id = newId('cmd-');

    // An "industry" order hands raw metal to the workshop: take it out of the
    // matching scrap (cassie) stock of that metal category.
    if (c.type === 'industry' && Number(c.initialWeight) > 0) {
      const cat = metalCategories.find(mc => mc.name.toLowerCase() === String(c.metal || '').toLowerCase());
      const source =
        metalTypes.find(mt => mt.isCassie && cat && mt.metalCategoryId === cat.id) ||
        metalTypes.find(mt => mt.isCassie);
      if (source) {
        setMetalTypes(prev => prev.map(mt => mt.id === source.id
          ? { ...mt, initialQuantity: Math.max(0, Number(mt.initialQuantity || 0) - Number(c.initialWeight)) }
          : mt));
      }
    }

    setCommands(prev => [...prev, { ...c, id }]);
  };

  const updateCommand = async (id: string, c: Partial<Command>) => {
    setCommands(prev => prev.map(item => item.id === id ? { ...item, ...c } : item));
  };

  const deleteCommand = async (id: string) => {
    setCommands(prev => prev.filter(item => item.id !== id));
  };

  // ── WORKERS ──────────────────────────────────────────────────────────────
  const addWorker = async (w: Omit<Worker, 'id'>) => {
    setWorkers(prev => [...prev, { ...w, id: newId('wk-'), createdAt: w.createdAt || new Date().toISOString() } as Worker]);
  };
  const updateWorker = async (id: string, w: Partial<Worker>) => {
    setWorkers(prev => prev.map(item => item.id === id ? { ...item, ...w } : item));
  };
  const deleteWorker = async (id: string) => {
    setWorkers(prev => prev.filter(item => item.id !== id));
  };

  const addAdvance = async (a: Omit<WorkerAdvance, 'id'>) => {
    setWorkerAdvances(prev => [...prev, { ...a, id: newId('adv-') }]);
  };
  const addAbsence = async (a: Omit<WorkerAbsence, 'id'>) => {
    setWorkerAbsences(prev => [...prev, { ...a, id: newId('abs-') }]);
  };
  const addWorkerPayment = async (p: Omit<WorkerPaymentRecord, 'id'>) => {
    setWorkerPayments(prev => [...prev, { ...p, id: newId('wp-') }]);
  };

  // ── DELIVERIES ───────────────────────────────────────────────────────────
  const addDelivery = async (d: Omit<Delivery, 'id'>) => {
    setDeliveries(prev => [...prev, { ...d, id: newId('dl-'), paymentHistory: d.paymentHistory || [] }]);
  };
  const updateDelivery = async (id: string, d: Partial<Delivery>) => {
    setDeliveries(prev => prev.map(item => item.id === id ? { ...item, ...d } : item));
  };
  const deleteDelivery = async (id: string) => {
    setDeliveries(prev => prev.filter(item => item.id !== id));
  };
  const addPaymentAction = async (deliveryId: string, p: Omit<PaymentAction, 'id'>) => {
    const payment = { ...p, id: newId('dlp-') };
    setDeliveries(prev => prev.map(d => d.id === deliveryId
      ? { ...d, paymentHistory: [...(d.paymentHistory || []), payment] }
      : d));
  };
  const deletePaymentAction = async (deliveryId: string, paymentId: string) => {
    setDeliveries(prev => prev.map(d => d.id === deliveryId
      ? { ...d, paymentHistory: (d.paymentHistory || []).filter(p => p.id !== paymentId) }
      : d));
  };

  // ── STORE EXPENSES ───────────────────────────────────────────────────────
  const addStoreExpense = async (e: Omit<StoreExpense, 'id'>) => {
    setStoreExpenses(prev => [...prev, { ...e, id: newId('ex-') }]);
  };
  const updateStoreExpense = async (id: string, e: Partial<StoreExpense>) => {
    setStoreExpenses(prev => prev.map(item => item.id === id ? { ...item, ...e } : item));
  };
  const deleteStoreExpense = async (id: string) => {
    setStoreExpenses(prev => prev.filter(item => item.id !== id));
  };

  // ── CLIENTS ──────────────────────────────────────────────────────────────
  const addClient = async (c: Omit<Client, 'id' | 'payments'>) => {
    setClients(prev => [...prev, {
      id: newId('cl-'), name: c.name, phone: c.phone || '', note: c.note || '',
      payments: [], recuperations: [],
    }]);
  };
  const updateClient = async (id: string, c: Partial<Client>) => {
    setClients(prev => prev.map(item => item.id === id ? { ...item, ...c } : item));
  };
  const deleteClient = async (id: string) => {
    setClients(prev => prev.filter(item => item.id !== id));
  };
  const addClientPayment = async (clientId: string, p: Omit<ClientPayment, 'id'>) => {
    const payment = { ...p, id: newId('clp-') };
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, payments: [...c.payments, payment] } : c));
  };
  const updateClientPayment = async (clientId: string, paymentId: string, p: Partial<ClientPayment>) => {
    setClients(prev => prev.map(c => c.id === clientId
      ? { ...c, payments: c.payments.map(pm => pm.id === paymentId ? { ...pm, ...p, amount: Number(p.amount ?? pm.amount) || 0 } : pm) }
      : c));
  };
  const deleteClientPayment = async (clientId: string, paymentId: string) => {
    setClients(prev => prev.map(c => c.id === clientId
      ? { ...c, payments: c.payments.filter(pm => pm.id !== paymentId) }
      : c));
  };
  const addClientRecuperation = async (clientId: string, r: Omit<ClientRecuperation, 'id'>) => {
    const rec = { ...r, id: newId('clr-') };
    setClients(prev => prev.map(c => c.id === clientId
      ? { ...c, recuperations: [...(c.recuperations || []), rec] }
      : c));
  };
  const updateClientRecuperation = async (clientId: string, recuperationId: string, r: Partial<ClientRecuperation>) => {
    setClients(prev => prev.map(c => c.id === clientId
      ? { ...c, recuperations: (c.recuperations || []).map(rec => rec.id === recuperationId ? { ...rec, ...r, amount: Number(r.amount ?? rec.amount) || 0 } : rec) }
      : c));
  };
  const deleteClientRecuperation = async (clientId: string, recuperationId: string) => {
    setClients(prev => prev.map(c => c.id === clientId
      ? { ...c, recuperations: (c.recuperations || []).filter(rec => rec.id !== recuperationId) }
      : c));
  };

  // ── DEBTS ────────────────────────────────────────────────────────────────
  const addDebt = async (d: Omit<Debt, 'id' | 'date' | 'amountPaid' | 'remaining' | 'isPaid'>) => {
    const amount = Number(d.amount) || 0;
    const amountPaid = Number((d as any).amountPaid) || 0;
    const remaining = Math.max(0, amount - amountPaid);
    setDebts(prev => [...prev, {
      id: newId('dt-'), date: new Date().toISOString(), name: d.name, direction: d.direction,
      amount, amountPaid, remaining, isPaid: remaining <= 0, note: d.note,
    }]);
  };

  const updateDebt = async (id: string, d: Partial<Debt>) => {
    setDebts(prev => prev.map(item => {
      if (item.id !== id) return item;
      const amount = d.amount !== undefined ? Number(d.amount) : item.amount;
      const amountPaid = d.amountPaid !== undefined ? Number(d.amountPaid) : (item.amountPaid || 0);
      const remaining = Math.max(0, amount - amountPaid);
      return { ...item, ...d, amount, amountPaid, remaining, isPaid: remaining <= 0 };
    }));
  };

  const deleteDebt = async (id: string) => {
    setDebts(prev => prev.filter(item => item.id !== id));
  };

  const payDebt = async (id: string, amt: number) => {
    const pay = Number(amt) || 0;
    if (pay <= 0) return;
    setDebts(prev => prev.map(item => {
      if (item.id !== id) return item;
      const afterPaid = (item.amountPaid || 0) + pay;
      const remaining = Math.max(0, (item.amount || 0) - afterPaid);
      return { ...item, amountPaid: afterPaid, remaining, isPaid: remaining <= 0 };
    }));
  };

  // ── DEBT PAYMENT LEDGER ──────────────────────────────────────────────────
  // Recompute an invoice after `delta` is added to (or removed from) its paid
  // amount. Returns a full invoice object — never mutates the argument.
  const buildPurchasePatch = (inv: PurchaseInvoice, delta: number, method: DebtPayment['method']): PurchaseInvoice => {
    const invoiceTotal = inv.items.reduce((a, b) => a + (b.totalPrice || 0), 0);
    const paid = (inv.amountPaid !== undefined && inv.amountPaid !== null) ? inv.amountPaid : (inv.payment?.total || 0);
    const newPaid = Math.max(0, Math.min(invoiceTotal, paid + delta));
    const applied = newPaid - paid;
    const payment = { ...(inv.payment || {}) } as PurchaseInvoice['payment'];
    if (method === 'cash') {
      payment.cash = Math.max(0, (payment.cash || 0) + applied);
      payment.total = Math.max(0, (payment.total || 0) + applied);
    }
    const remaining = Math.max(0, invoiceTotal - newPaid);
    return { ...inv, payment, amountPaid: newPaid, remaining, isDebt: remaining > 0 };
  };

  const persistPurchases = (updated: PurchaseInvoice[]) => {
    if (!updated.length) return;
    const byId = new Map(updated.map(inv => [inv.id, inv]));
    setPurchases(prev => prev.map(item => byId.get(item.id) || item));
  };

  // Undo a payment's effect on the invoices it was applied to. `working` carries
  // pending edits so several operations can be staged before a single write.
  const reverseAllocations = (payment: DebtPayment, working: Map<string, PurchaseInvoice>) => {
    const allocs = (payment.allocations && payment.allocations.length)
      ? payment.allocations
      : (payment.invoiceId ? [{ invoiceId: payment.invoiceId, amount: payment.amount }] : []);
    allocs.forEach(a => {
      const inv = working.get(a.invoiceId) || purchases.find(pp => pp.id === a.invoiceId);
      if (!inv) return;
      working.set(a.invoiceId, buildPurchasePatch(inv, -Math.abs(a.amount), payment.method));
    });
  };

  // Spread `amount` over a supplier's still-unpaid invoices, oldest first.
  const allocateToSupplier = (supplierId: string, amount: number, method: DebtPayment['method'], working: Map<string, PurchaseInvoice>) => {
    const allocations: { invoiceId: string; amount: number }[] = [];
    let left = amount;
    const invoices = purchases
      .filter(pp => pp.supplierId === supplierId)
      .map(pp => working.get(pp.id) || pp)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const inv of invoices) {
      if (left <= 0) break;
      const invoiceTotal = inv.items.reduce((a, b) => a + (b.totalPrice || 0), 0);
      const paid = (inv.amountPaid !== undefined && inv.amountPaid !== null) ? inv.amountPaid : (inv.payment?.total || 0);
      const remaining = Math.max(0, invoiceTotal - paid);
      if (remaining <= 0) continue;
      const applied = Math.min(left, remaining);
      left -= applied;
      working.set(inv.id, buildPurchasePatch(inv, applied, method));
      allocations.push({ invoiceId: inv.id, amount: applied });
    }
    return allocations;
  };

  /** Give back (or take away) stock when a metal-settled payment changes. */
  const adjustMetalStock = (metalTypeId: string | undefined, deltaGrams: number) => {
    if (!metalTypeId || !deltaGrams) return;
    setMetalTypes(prev => prev.map(mt => mt.id === metalTypeId
      ? { ...mt, initialQuantity: Math.max(0, Number(mt.initialQuantity || 0) + deltaGrams) }
      : mt));
  };

  const addDebtPayment = async (p: Omit<DebtPayment, 'id' | 'createdAt'>) => {
    const id = newId('dp-');
    const record: DebtPayment = {
      ...p, id, createdAt: new Date().toISOString(),
      amount: Number(p.amount) || 0,
      allocations: p.allocations || [],
    };
    setDebtPayments(prev => [...prev, record]);
    return id;
  };

  const updateDebtPayment = async (id: string, patch: Partial<DebtPayment>) => {
    const existing = debtPayments.find(d => d.id === id);
    if (!existing) return;
    const merged: DebtPayment = { ...existing, ...patch };
    merged.amount = Number(merged.amount) || 0;

    if (existing.partyType === 'supplier' && merged.amount !== existing.amount) {
      const working = new Map<string, PurchaseInvoice>();
      reverseAllocations(existing, working);
      merged.allocations = allocateToSupplier(existing.partyId, merged.amount, merged.method, working);
      persistPurchases([...working.values()]);
    }

    if (merged.method === 'silver' || merged.method === 'gold') {
      const ppg = Number(merged.pricePerGram) || 0;
      const newWeight = ppg > 0 ? merged.amount / ppg : (merged.weight || 0);
      adjustMetalStock(merged.metalTypeId, (existing.weight || 0) - newWeight);
      merged.weight = newWeight;
    }

    setDebtPayments(prev => prev.map(d => d.id === id ? merged : d));
  };

  const deleteDebtPayment = async (id: string) => {
    const existing = debtPayments.find(d => d.id === id);
    if (existing) {
      if (existing.partyType === 'supplier') {
        const working = new Map<string, PurchaseInvoice>();
        reverseAllocations(existing, working);
        persistPurchases([...working.values()]);
      }
      if ((existing.method === 'silver' || existing.method === 'gold') && existing.weight) {
        adjustMetalStock(existing.metalTypeId, existing.weight);
      }
    }
    setDebtPayments(prev => prev.filter(d => d.id !== id));
  };

  // ── CASSIE (SCRAP) PURCHASES ─────────────────────────────────────────────
  const addCassiePurchase = async (cp: Omit<CassiePurchase, 'id' | 'date' | 'isMelted'>) => {
    const record: CassiePurchase = { ...cp, id: newId('cp-'), date: new Date().toISOString(), isMelted: false };
    setCassiePurchases(prev => [...prev, record]);
    setMetalTypes(prev => prev.map(mt => mt.id === cp.metalTypeId && mt.isCassie
      ? { ...mt, initialQuantity: Number(mt.initialQuantity || 0) + Number(cp.weight || 0) }
      : mt));
  };

  const updateCassiePurchase = async (id: string, cp: Partial<CassiePurchase>) => {
    const old = cassiePurchases.find(p => p.id === id);
    if (!old) return;
    const updated = { ...old, ...cp };
    const oldWeight = Number(old.weight || 0);
    const newWeight = Number(updated.weight || 0);

    setMetalTypes(prev => {
      let next = prev.map(mt => ({ ...mt }));
      if (cp.metalTypeId && cp.metalTypeId !== old.metalTypeId) {
        next = next.map(mt => mt.id === old.metalTypeId && mt.isCassie
          ? { ...mt, initialQuantity: Math.max(0, Number(mt.initialQuantity || 0) - oldWeight) } : mt);
        next = next.map(mt => mt.id === cp.metalTypeId && mt.isCassie
          ? { ...mt, initialQuantity: Number(mt.initialQuantity || 0) + newWeight } : mt);
      } else if (newWeight !== oldWeight) {
        next = next.map(mt => mt.id === (cp.metalTypeId || old.metalTypeId) && mt.isCassie
          ? { ...mt, initialQuantity: Math.max(0, Number(mt.initialQuantity || 0) + (newWeight - oldWeight)) } : mt);
      }
      return next;
    });

    setCassiePurchases(prev => prev.map(p => p.id === id ? updated : p));
  };

  const deleteCassiePurchase = async (id: string) => {
    const purchase = cassiePurchases.find(p => p.id === id);
    if (!purchase) return;
    setMetalTypes(prev => prev.map(mt => mt.id === purchase.metalTypeId && mt.isCassie
      ? { ...mt, initialQuantity: Math.max(0, Number(mt.initialQuantity || 0) - Number(purchase.weight || 0)) }
      : mt));
    setCassiePurchases(prev => prev.filter(p => p.id !== id));
  };

  const meltCassiePurchases = async (purchaseIds: string[], postWeight: number, targetMetalTypeId: string) => {
    if (purchaseIds.length === 0) return;
    const melted = cassiePurchases.filter(p => purchaseIds.includes(p.id));
    const totalPreWeight = melted.reduce((s, p) => s + Number(p.weight || 0), 0);
    const totalPrice = melted.reduce((s, p) => s + Number(p.totalPrice || 0), 0);
    const post = Number(postWeight) || 0;

    const melting: MeltingRecord = {
      id: newId('ml-'), date: new Date().toISOString(), purchaseIds,
      loss: totalPreWeight - post, totalPreWeight, postWeight: post, totalPrice,
      pricePerGramAfter: post > 0 ? totalPrice / post : 0,
      targetMetalTypeId,
    };

    setMeltings(prev => [...prev, melting]);
    setCassiePurchases(prev => prev.map(p => purchaseIds.includes(p.id) ? { ...p, isMelted: true } : p));
    setMetalTypes(prev => prev.map(mt => mt.id === targetMetalTypeId && mt.isCassie
      ? { ...mt, initialQuantity: Number(mt.initialQuantity || 0) + post }
      : mt));
  };

  const deleteMeltingRecord = async (id: string) => {
    const melting = meltings.find(m => m.id === id);
    if (!melting) return;
    setMetalTypes(prev => prev.map(mt => mt.id === melting.targetMetalTypeId && mt.isCassie
      ? { ...mt, initialQuantity: Math.max(0, Number(mt.initialQuantity || 0) - Number(melting.postWeight || 0)) }
      : mt));
    setCassiePurchases(prev => prev.map(p => melting.purchaseIds.includes(p.id) ? { ...p, isMelted: false } : p));
    setMeltings(prev => prev.filter(m => m.id !== id));
  };

  const updateMeltingRecord = async (id: string, postWeight: number, targetMetalTypeId: string) => {
    const old = meltings.find(m => m.id === id);
    if (!old) return;
    const oldPostWeight = Number(old.postWeight || 0);
    const newPostWeight = Number(postWeight) || 0;
    const weightDiff = newPostWeight - oldPostWeight;
    const updated: MeltingRecord = {
      ...old,
      postWeight: newPostWeight,
      targetMetalTypeId,
      pricePerGramAfter: newPostWeight > 0 ? Number(old.totalPrice || 0) / newPostWeight : 0,
      loss: Number(old.totalPreWeight || 0) - newPostWeight,
    };

    setMetalTypes(prev => {
      let next = prev.map(mt => ({ ...mt }));
      if (targetMetalTypeId !== old.targetMetalTypeId) {
        next = next.map(mt => mt.id === old.targetMetalTypeId && mt.isCassie
          ? { ...mt, initialQuantity: Math.max(0, Number(mt.initialQuantity || 0) - oldPostWeight) } : mt);
        next = next.map(mt => mt.id === targetMetalTypeId && mt.isCassie
          ? { ...mt, initialQuantity: Number(mt.initialQuantity || 0) + newPostWeight } : mt);
      } else if (weightDiff !== 0) {
        next = next.map(mt => mt.id === targetMetalTypeId && mt.isCassie
          ? { ...mt, initialQuantity: Math.max(0, Number(mt.initialQuantity || 0) + weightDiff) } : mt);
      }
      return next;
    });

    setMeltings(prev => prev.map(m => m.id === id ? updated : m));
  };

  // ── REPLACEMENTS ─────────────────────────────────────────────────────────
  const applyReplacementToInventory = (
    base: MetalType[],
    type: string,
    returnedItem: any,
    newItem: any,
    sign: 1 | -1
  ): MetalType[] => {
    let next = base.map(mt => ({ ...mt, shapes: { ...(mt.shapes || {}) } }));
    const applyItem = (item: any, addWeight: boolean) => {
      if (!item) return;
      next = applyStockDelta(
        next, item.metalTypeId, item.shape,
        Number(item.weight) || 0, Number(item.quantity) || 0,
        addWeight ? 1 : -1
      );
    };
    applyItem(returnedItem, sign === 1);
    if (type === 'exchange') applyItem(newItem, sign === -1);
    return next;
  };

  const addReplacement = async (r: Omit<ReplacementInvoice, 'id' | 'date' | 'amountDifference' | 'amountToPay' | 'amountToRefund'>) => {
    const returned = r.returnedItem;
    const returnedTotal = (Number(returned.weight) || 0) * (Number(returned.pricePerGram) || 0);
    let amountDifference = 0, amountToPay = 0, amountToRefund = 0;
    if (r.type === 'exchange' && r.newItem) {
      const nw = r.newItem;
      amountDifference = (Number(nw.weight) || 0) * (Number(nw.pricePerGram) || 0) - returnedTotal;
      if (amountDifference > 0) amountToPay = amountDifference;
      else amountToRefund = Math.abs(amountDifference);
    } else if (r.type === 'buyback') {
      amountToRefund = (Number(returned.weight) || 0) * (Number(r.buyBackPricePerGram) || 0);
    }

    const invoice = {
      id: newId('rp-'), date: new Date().toISOString(), ...r,
      amountDifference, amountToPay, amountToRefund,
    } as ReplacementInvoice;

    setReplacements(prev => [...prev, invoice]);
    setMetalTypes(prev => applyReplacementToInventory(prev, r.type, r.returnedItem, r.newItem, 1));
  };

  const updateReplacement = async (id: string, r: Partial<ReplacementInvoice>) => {
    const old = replacements.find(x => x.id === id);
    if (!old) return;
    const merged = { ...old, ...r } as ReplacementInvoice;
    setMetalTypes(prev => {
      let next = applyReplacementToInventory(prev, old.type, old.returnedItem, old.newItem, -1);
      next = applyReplacementToInventory(next, merged.type, merged.returnedItem, merged.newItem, 1);
      return next;
    });
    setReplacements(prev => prev.map(item => item.id === id ? merged : item));
  };

  const deleteReplacement = async (id: string) => {
    const old = replacements.find(x => x.id === id);
    if (!old) return;
    setMetalTypes(prev => applyReplacementToInventory(prev, old.type, old.returnedItem, old.newItem, -1));
    setReplacements(prev => prev.filter(x => x.id !== id));
  };

  // ── SETTINGS / SHAPES / CALIBRES ─────────────────────────────────────────
  const updateSettings = async (s: Partial<StoreSettings>) => {
    setSettings(prev => ({ ...prev, ...s }));
  };

  const addShape = async (name: string) => {
    if (!name || shapes.includes(name)) return;
    setShapes(prev => [...prev, name]);
    setMetalTypes(prev => prev.map(mt => ({ ...mt, shapes: { ...mt.shapes, [name]: 0 } })));
  };

  const updateShape = async (oldName: string, newName: string) => {
    setShapes(prev => prev.map(s => s === oldName ? newName : s));
    setMetalTypes(prev => prev.map(mt => {
      const ns: Record<string, number> = {};
      Object.keys(mt.shapes || {}).forEach(k => { ns[k === oldName ? newName : k] = (mt.shapes as any)[k]; });
      return { ...mt, shapes: ns };
    }));
  };

  const deleteShape = async (name: string) => {
    setShapes(prev => prev.filter(s => s !== name));
    setMetalTypes(prev => prev.map(mt => {
      const ns: Record<string, number> = { ...mt.shapes };
      delete ns[name];
      return { ...mt, shapes: ns };
    }));
  };

  const addCalibre = async (calibre: string) => {
    if (!calibre || calibres.includes(calibre)) return;
    setCalibresList(prev => [...prev, calibre]);
  };

  const deleteCalibre = async (calibre: string) => {
    setCalibresList(prev => prev.filter(c => c !== calibre));
    setMetalCategories(prev => prev.map(c => ({ ...c, calibres: c.calibres.filter(x => x !== calibre) })));
  };

  const setMinimalWeight = async (weight: number) => {
    setMinimalWeightState(Number(weight) || 0);
  };

  // ── ONLINE SHOP ──────────────────────────────────────────────────────────
  const addWebOffer = async (o: Omit<WebOffer, 'id' | 'createdAt'>) => {
    setWebOffers(prev => [...prev, { ...o, id: newId('wo-'), createdAt: new Date().toISOString() }]);
  };
  const updateWebOffer = async (id: string, o: Partial<WebOffer>) => {
    setWebOffers(prev => prev.map(item => item.id === id ? { ...item, ...o } : item));
  };
  const deleteWebOffer = async (id: string) => {
    setWebOffers(prev => prev.filter(item => item.id !== id));
  };

  const addWebSpecialOffer = async (o: Omit<WebSpecialOffer, 'id' | 'createdAt'>) => {
    setWebSpecialOffers(prev => [...prev, { ...o, id: newId('wso-'), createdAt: new Date().toISOString() }]);
  };
  const updateWebSpecialOffer = async (id: string, o: Partial<WebSpecialOffer>) => {
    setWebSpecialOffers(prev => prev.map(item => item.id === id ? { ...item, ...o } : item));
  };
  const deleteWebSpecialOffer = async (id: string) => {
    setWebSpecialOffers(prev => prev.filter(item => item.id !== id));
  };

  const addWebDeliveryCompany = async (c: Omit<WebDeliveryCompany, 'id'>) => {
    setWebDeliveryCompanies(prev => [...prev, { ...c, id: newId('wdc-') }]);
  };
  const updateWebDeliveryCompany = async (id: string, c: Partial<WebDeliveryCompany>) => {
    setWebDeliveryCompanies(prev => prev.map(item => item.id === id ? { ...item, ...c } : item));
  };
  const deleteWebDeliveryCompany = async (id: string) => {
    setWebDeliveryCompanies(prev => prev.filter(item => item.id !== id));
  };

  const updateWebContacts = async (c: Partial<WebContacts>) => {
    setWebContacts(prev => ({ ...prev, ...c }));
  };

  const addWebOrder = async (o: Omit<WebOrder, 'id' | 'createdAt' | 'orderNumber' | 'status'>): Promise<string> => {
    const id = newId('wor-');
    const order = {
      ...o, id,
      orderNumber: 'CMD-WEB-' + id.replace('wor-', ''),
      createdAt: new Date().toISOString(),
      status: 'pending' as const,
      storageDeducted: false,
    } as WebOrder;

    // Orders are placed by anonymous visitors, for whom the state mirror is
    // switched off — so this one write goes to the database directly.
    await repo.saveOne(repo.webOrderMapper, order);
    setWebOrders(prev => [...prev, order]);
    return id;
  };

  const updateWebOrder = async (id: string, o: Partial<WebOrder>) => {
    setWebOrders(prev => prev.map(item => item.id === id ? { ...item, ...o } : item));
  };

  const deleteWebOrder = async (id: string) => {
    setWebOrders(prev => prev.filter(item => item.id !== id));
  };

  const finalizeWebOrder = async (id: string) => {
    const order = webOrders.find(o => o.id === id);
    if (!order) return;
    const finalizedAt = new Date().toISOString();

    setMetalTypes(prev => {
      let next = prev.map(mt => ({ ...mt, shapes: { ...(mt.shapes || {}) } }));
      order.items.forEach(item => {
        if (!item.metalTypeId) return;
        next = applyStockDelta(
          next, item.metalTypeId, item.form,
          Number(item.weight) || 0, Number(item.quantity) || 0, -1
        );
      });
      return next;
    });

    setWebOrders(prev => prev.map(item => item.id === id
      ? { ...item, status: 'finalized' as const, finalizedAt, storageDeducted: true }
      : item));
  };

  const cancelWebOrder = async (id: string, recoverStock?: boolean) => {
    const order = webOrders.find(o => o.id === id);
    const cancelledAt = new Date().toISOString();

    if (recoverStock && order?.storageDeducted) {
      setMetalTypes(prev => {
        let next = prev.map(mt => ({ ...mt, shapes: { ...(mt.shapes || {}) } }));
        (order.items || []).forEach(item => {
          if (!item.metalTypeId) return;
          next = applyStockDelta(
            next, item.metalTypeId, item.form,
            Number(item.weight) || 0, Number(item.quantity) || 0, 1
          );
        });
        return next;
      });
    }

    setWebOrders(prev => prev.map(item => item.id === id
      ? { ...item, status: 'cancelled' as const, cancelledAt }
      : item));
  };

  // ── LOCAL BACKUP / RESTORE ───────────────────────────────────────────────
  const exportSnapshot = () => ({
    version: 2,
    exportedAt: new Date().toISOString(),
    metalCategories, metalTypes, shapes, calibres, suppliers, purchases, sales,
    workshops, commands, workers, workerAdvances, workerAbsences, workerPayments,
    deliveries, storeExpenses, debts, debtPayments, clients, replacements,
    cassiePurchases, meltings, settings, minimalWeight,
    webOffers, webSpecialOffers, webDeliveryCompanies, webContacts, webOrders,
  });

  const importSnapshot = (snapshot: Record<string, any>) => {
    if (!snapshot || typeof snapshot !== 'object') return;
    const take = <T,>(key: string, setter: (v: T) => void) => {
      if (snapshot[key] !== undefined && snapshot[key] !== null) setter(snapshot[key] as T);
    };
    take<MetalCategory[]>('metalCategories', setMetalCategories);
    take<MetalType[]>('metalTypes', setMetalTypes);
    take<string[]>('shapes', setShapes);
    take<string[]>('calibres', setCalibresList);
    take<Supplier[]>('suppliers', setSuppliers);
    take<PurchaseInvoice[]>('purchases', setPurchases);
    take<SaleInvoice[]>('sales', setSales);
    take<Workshop[]>('workshops', setWorkshops);
    take<Command[]>('commands', setCommands);
    take<Worker[]>('workers', setWorkers);
    take<WorkerAdvance[]>('workerAdvances', setWorkerAdvances);
    take<WorkerAbsence[]>('workerAbsences', setWorkerAbsences);
    take<WorkerPaymentRecord[]>('workerPayments', setWorkerPayments);
    take<Delivery[]>('deliveries', setDeliveries);
    take<StoreExpense[]>('storeExpenses', setStoreExpenses);
    take<Debt[]>('debts', setDebts);
    take<DebtPayment[]>('debtPayments', setDebtPayments);
    take<Client[]>('clients', setClients);
    take<ReplacementInvoice[]>('replacements', setReplacements);
    take<CassiePurchase[]>('cassiePurchases', setCassiePurchases);
    take<MeltingRecord[]>('meltings', setMeltings);
    take<StoreSettings>('settings', setSettings);
    take<number>('minimalWeight', setMinimalWeightState);
    take<WebOffer[]>('webOffers', setWebOffers);
    take<WebSpecialOffer[]>('webSpecialOffers', setWebSpecialOffers);
    take<WebDeliveryCompany[]>('webDeliveryCompanies', setWebDeliveryCompanies);
    take<WebContacts>('webContacts', setWebContacts);
    take<WebOrder[]>('webOrders', setWebOrders);
  };

  const resetDemoData = () => importSnapshot(clone(DEMO_DATASET) as Record<string, any>);

  return (
    <AppContext.Provider value={{
      user, language, theme, isLoading,
      metalCategories, metalTypes, shapes, calibres, metals,
      suppliers, purchases, sales, workshops, commands, workers,
      workerAdvances, workerAbsences, workerPayments, deliveries, storeExpenses,
      debts, debtPayments, clients, replacements, cassiePurchases, meltings,
      minimalWeight, settings,
      setUser, setLanguage, setTheme,
      addMetalCategory, updateMetalCategory, deleteMetalCategory,
      metalPriceFor, categoryOf, categoryLabel,
      addMetalType, updateMetalType, deleteMetalType,
      addSupplier, updateSupplier, deleteSupplier,
      addPurchase, updatePurchase, deletePurchase,
      addSale, updateSale, deleteSale,
      addWorkshop, updateWorkshop, deleteWorkshop,
      addCommand, updateCommand, deleteCommand,
      addWorker, updateWorker, deleteWorker,
      addAdvance, addAbsence, addWorkerPayment,
      addDelivery, updateDelivery, deleteDelivery, addPaymentAction, deletePaymentAction,
      addStoreExpense, updateStoreExpense, deleteStoreExpense,
      addClient, updateClient, deleteClient,
      addClientPayment, updateClientPayment, deleteClientPayment,
      addClientRecuperation, updateClientRecuperation, deleteClientRecuperation,
      addReplacement, updateReplacement, deleteReplacement,
      addDebt, updateDebt, deleteDebt, payDebt,
      addDebtPayment, updateDebtPayment, deleteDebtPayment,
      addCassiePurchase, updateCassiePurchase, deleteCassiePurchase,
      meltCassiePurchases, deleteMeltingRecord, updateMeltingRecord,
      addShape, updateShape, deleteShape,
      addCalibre, deleteCalibre, addMetal, deleteMetal,
      setMinimalWeight, updateSettings,
      webOffers, addWebOffer, updateWebOffer, deleteWebOffer,
      webSpecialOffers, addWebSpecialOffer, updateWebSpecialOffer, deleteWebSpecialOffer,
      webDeliveryCompanies, addWebDeliveryCompany, updateWebDeliveryCompany, deleteWebDeliveryCompany,
      webContacts, updateWebContacts,
      webOrders, addWebOrder, updateWebOrder, deleteWebOrder, finalizeWebOrder, cancelWebOrder,
      exportSnapshot, importSnapshot, resetDemoData,
      permissions, can, isAuthReady, hasAdmin,
      signIn, signOut, createAdminAccount, refreshAdminExists, reloadPermissions, reloadWorkers,
      syncError, clearSyncError: () => setSyncError(null),
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

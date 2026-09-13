/**
 * ─── PERSISTENCE LAYER ───────────────────────────────────────────────────────
 * Translates between the camelCase objects the UI works with and the snake_case
 * rows Postgres stores, for every ledger in the application.
 *
 * The store in AppContext keeps its existing shape and its existing business
 * rules; this module simply mirrors each change into Supabase. That is why an
 * action like `addPurchase` still computes stock deltas in memory — it just
 * ends up persisted as well.
 */
import { supabase } from './supabase';
import type {
  MetalCategory, MetalType, Supplier, PurchaseInvoice, SaleInvoice, Workshop,
  Command, Worker, WorkerAdvance, WorkerAbsence, WorkerPaymentRecord, Delivery,
  StoreExpense, Debt, DebtPayment, Client, ReplacementInvoice, CassiePurchase,
  MeltingRecord, StoreSettings, WebOffer, WebSpecialOffer, WebDeliveryCompany,
  WebContacts, WebOrder,
} from '../types';

const num = (v: any, d = 0): number => (v === null || v === undefined || v === '' ? d : Number(v));
const str = (v: any, d = ''): string => (v === null || v === undefined ? d : String(v));
const iso = (v: any): string => (v ? new Date(v).toISOString() : new Date().toISOString());
const nullIfEmpty = (v: any) => (v === '' || v === undefined ? null : v);

/** A nested array that lives in its own table (invoice lines, payments…). */
interface ChildSpec<T> {
  table: string;
  parentKey: string;
  /** Rows to write for one parent. */
  toRows: (parent: T, parentId: string) => Record<string, any>[];
}

export interface Mapper<T> {
  table: string;
  /** PostgREST select string — embeds children so one round trip loads all. */
  select: string;
  toRow: (obj: T) => Record<string, any>;
  fromRow: (row: any) => T;
  children?: ChildSpec<T>[];
  orderBy?: { column: string; ascending?: boolean };
}

// ════════════════════════════════════════════════════════════════════════════
//  MAPPERS
// ════════════════════════════════════════════════════════════════════════════

export const metalCategoryMapper: Mapper<MetalCategory> = {
  table: 'metal_categories',
  select: '*',
  toRow: c => ({
    id: c.id, name: c.name, name_ar: str(c.nameAr), color: str(c.color, '#8FA0B4'),
    calibres: c.calibres || [], price_per_gram: num(c.pricePerGram), is_built_in: !!c.isBuiltIn,
  }),
  fromRow: r => ({
    id: r.id, name: r.name, nameAr: str(r.name_ar), color: str(r.color, '#8FA0B4'),
    calibres: r.calibres || [], pricePerGram: num(r.price_per_gram), isBuiltIn: !!r.is_built_in,
  }),
};

export const metalTypeMapper: Mapper<MetalType> = {
  table: 'metal_types',
  select: '*',
  toRow: t => ({
    id: t.id, name: t.name, metal_category_id: t.metalCategoryId, calibre: str(t.calibre),
    initial_quantity: num(t.initialQuantity), is_cassie: !!t.isCassie,
    is_ala_piece: !!t.isAlaPiece, shapes: t.shapes || {},
  }),
  fromRow: r => ({
    id: r.id, name: r.name, metalCategoryId: r.metal_category_id, calibre: str(r.calibre),
    initialQuantity: num(r.initial_quantity), isCassie: !!r.is_cassie,
    isAlaPiece: !!r.is_ala_piece, shapes: r.shapes || {},
  }),
};

export const supplierMapper: Mapper<Supplier> = {
  table: 'suppliers',
  select: '*',
  toRow: s => ({ id: s.id, name: s.name, phone: str(s.phone), address: str(s.address) }),
  fromRow: r => ({ id: r.id, name: r.name, phone: str(r.phone), address: str(r.address) }),
};

export const purchaseMapper: Mapper<PurchaseInvoice> = {
  table: 'purchase_invoices',
  select: '*, purchase_invoice_items(*)',
  orderBy: { column: 'date', ascending: true },
  toRow: p => ({
    id: p.id, supplier_id: p.supplierId, date: iso(p.date),
    pay_cash: num(p.payment?.cash),
    pay_cassie_silver_grams: num(p.payment?.cassieSilverGrams),
    pay_cassie_silver_price_gram: num(p.payment?.cassieSilverPricePerGram),
    pay_cassie_gold_grams: num(p.payment?.cassieGoldGrams),
    pay_cassie_gold_price_gram: num(p.payment?.cassieGoldPricePerGram),
    pay_cassie_silver_type_id: nullIfEmpty((p.payment as any)?.cassieSilverTypeId),
    pay_cassie_gold_type_id: nullIfEmpty((p.payment as any)?.cassieGoldTypeId),
    pay_total: num(p.payment?.total),
    is_debt: !!p.isDebt, amount_paid: num(p.amountPaid), remaining: num(p.remaining),
  }),
  fromRow: r => ({
    id: r.id, supplierId: r.supplier_id, date: iso(r.date),
    items: (r.purchase_invoice_items || [])
      .slice()
      .sort((a: any, b: any) => a.line_no - b.line_no)
      .map((i: any) => ({
        metalTypeId: i.metal_type_id, shape: i.shape || undefined,
        weight: num(i.weight), pricePerGram: num(i.price_per_gram),
        laborCostPerGram: num(i.labor_cost_per_gram), totalPrice: num(i.total_price),
        pricingMode: i.pricing_mode, quantity: num(i.quantity),
        pricePerPiece: num(i.price_per_piece),
      })),
    payment: {
      cash: num(r.pay_cash),
      cassieSilverGrams: num(r.pay_cassie_silver_grams),
      cassieSilverPricePerGram: num(r.pay_cassie_silver_price_gram),
      cassieGoldGrams: num(r.pay_cassie_gold_grams),
      cassieGoldPricePerGram: num(r.pay_cassie_gold_price_gram),
      total: num(r.pay_total),
      ...(r.pay_cassie_silver_type_id ? { cassieSilverTypeId: r.pay_cassie_silver_type_id } : {}),
      ...(r.pay_cassie_gold_type_id ? { cassieGoldTypeId: r.pay_cassie_gold_type_id } : {}),
    } as any,
    isDebt: !!r.is_debt, amountPaid: num(r.amount_paid), remaining: num(r.remaining),
  }),
  children: [{
    table: 'purchase_invoice_items',
    parentKey: 'purchase_invoice_id',
    toRows: (p, id) => (p.items || []).map((i, n) => ({
      purchase_invoice_id: id, metal_type_id: i.metalTypeId, shape: nullIfEmpty(i.shape),
      weight: num(i.weight), price_per_gram: num(i.pricePerGram),
      labor_cost_per_gram: num(i.laborCostPerGram), total_price: num(i.totalPrice),
      pricing_mode: i.pricingMode || 'weight', quantity: num(i.quantity),
      price_per_piece: num(i.pricePerPiece), line_no: n,
    })),
  }],
};

export const saleMapper: Mapper<SaleInvoice> = {
  table: 'sale_invoices',
  select: '*, sale_invoice_items(*)',
  orderBy: { column: 'date', ascending: true },
  toRow: s => ({
    id: s.id, date: iso(s.date), worker_id: nullIfEmpty(s.workerId),
    client_name: str(s.clientName), client_phone: str(s.clientPhone),
    is_debt: !!s.isDebt, amount_paid: num(s.amountPaid), remaining: num(s.remaining),
    total: num(s.total),
  }),
  fromRow: r => ({
    id: r.id, date: iso(r.date), workerId: str(r.worker_id),
    clientName: str(r.client_name), clientPhone: str(r.client_phone),
    items: (r.sale_invoice_items || [])
      .slice()
      .sort((a: any, b: any) => a.line_no - b.line_no)
      .map((i: any) => ({
        metalTypeId: i.metal_type_id, shape: i.shape || '',
        weight: num(i.weight), pricePerGram: num(i.price_per_gram),
        totalPrice: num(i.total_price), isAlaPiece: !!i.is_ala_piece,
        quantity: num(i.quantity), pricePerPiece: num(i.price_per_piece),
      })),
    isDebt: !!r.is_debt, amountPaid: num(r.amount_paid), remaining: num(r.remaining),
    total: num(r.total),
  }),
  children: [{
    table: 'sale_invoice_items',
    parentKey: 'sale_invoice_id',
    toRows: (s, id) => (s.items || []).map((i, n) => ({
      sale_invoice_id: id, metal_type_id: i.metalTypeId, shape: nullIfEmpty(i.shape),
      weight: num(i.weight), price_per_gram: num(i.pricePerGram),
      total_price: num(i.totalPrice), is_ala_piece: !!i.isAlaPiece,
      quantity: num(i.quantity), price_per_piece: num(i.pricePerPiece), line_no: n,
    })),
  }],
};

export const workshopMapper: Mapper<Workshop> = {
  table: 'workshops',
  select: '*',
  toRow: w => ({ id: w.id, name: w.name, phone: str(w.phone), address: str(w.address) }),
  fromRow: r => ({ id: r.id, name: r.name, phone: str(r.phone), address: str(r.address) }),
};

export const commandMapper: Mapper<Command> = {
  table: 'commands',
  select: '*',
  orderBy: { column: 'date', ascending: true },
  toRow: c => ({
    id: c.id, type: c.type, client_name: c.clientName, client_phone: str(c.clientPhone),
    metal: str(c.metal), calibre: str(c.calibre), initial_weight: num(c.initialWeight),
    workshop_id: c.workshopId, date: iso(c.date), status: c.status,
    shape: nullIfEmpty(c.shape), paid_amount: num(c.paidAmount), note: str(c.note),
    payment_method: nullIfEmpty(c.paymentMethod), cassie_type_id: nullIfEmpty(c.cassieTypeId),
    workshop_cassie_amount: c.workshopCassieAmount ?? null,
    final_weight: c.finalWeight ?? null, workshop_price: c.workshopPrice ?? null,
    client_price: c.clientPrice ?? null, price_per_gram: c.pricePerGram ?? null,
    end_date: c.endDate ? iso(c.endDate) : null,
    delivery_id: nullIfEmpty(c.deliveryId), delivery_price: c.deliveryPrice ?? null,
  }),
  fromRow: r => ({
    id: r.id, type: r.type, clientName: r.client_name, clientPhone: str(r.client_phone),
    metal: str(r.metal), calibre: str(r.calibre), initialWeight: num(r.initial_weight),
    workshopId: r.workshop_id, date: iso(r.date), status: r.status,
    shape: r.shape || undefined, paidAmount: num(r.paid_amount), note: str(r.note),
    paymentMethod: r.payment_method || undefined, cassieTypeId: r.cassie_type_id || undefined,
    workshopCassieAmount: r.workshop_cassie_amount ?? undefined,
    finalWeight: r.final_weight ?? undefined, workshopPrice: r.workshop_price ?? undefined,
    clientPrice: r.client_price ?? undefined, pricePerGram: r.price_per_gram ?? undefined,
    endDate: r.end_date || undefined,
    deliveryId: r.delivery_id || undefined, deliveryPrice: r.delivery_price ?? undefined,
  }),
};

export const workerMapper: Mapper<Worker> = {
  table: 'workers',
  select: '*',
  toRow: w => ({
    id: w.id, full_name: w.fullName, phone: str(w.phone), address: str(w.address),
    payment_type: w.paymentType || 'monthly', salary: num(w.salary),
    username: str(w.username), created_at: w.createdAt ? iso(w.createdAt) : undefined,
  }),
  fromRow: r => ({
    id: r.id, fullName: r.full_name, phone: str(r.phone), address: str(r.address),
    paymentType: r.payment_type, salary: num(r.salary), username: str(r.username),
    createdAt: r.created_at,
  }),
};

const payrollMapper = <T extends { id: string; workerId: string; date: string }>(
  table: string, amountCol: string, amountField: string
): Mapper<T> => ({
  table,
  select: '*',
  toRow: (x: any) => ({ id: x.id, worker_id: x.workerId, [amountCol]: num(x[amountField]), date: iso(x.date) }),
  fromRow: (r: any) => ({ id: r.id, workerId: r.worker_id, [amountField]: num(r[amountCol]), date: iso(r.date) } as T),
});

export const workerAdvanceMapper = payrollMapper<WorkerAdvance>('worker_advances', 'amount', 'amount');
export const workerAbsenceMapper = payrollMapper<WorkerAbsence>('worker_absences', 'deduction', 'deduction');
export const workerPaymentMapper = payrollMapper<WorkerPaymentRecord>('worker_payments', 'amount', 'amount');

export const deliveryMapper: Mapper<Delivery> = {
  table: 'deliveries',
  select: '*, delivery_payments(*)',
  toRow: d => ({
    id: d.id, full_name: d.fullName, phone: str(d.phone), created_date: iso(d.createdDate),
  }),
  fromRow: r => ({
    id: r.id, fullName: r.full_name, phone: str(r.phone), createdDate: iso(r.created_date),
    paymentHistory: (r.delivery_payments || []).map((p: any) => ({
      id: p.id, amount: num(p.amount), date: iso(p.date), method: p.method,
    })),
  }),
  children: [{
    table: 'delivery_payments',
    parentKey: 'delivery_id',
    toRows: (d, id) => (d.paymentHistory || []).map(p => ({
      id: p.id, delivery_id: id, amount: num(p.amount), date: iso(p.date),
      method: p.method || 'cash',
    })),
  }],
};

export const storeExpenseMapper: Mapper<StoreExpense> = {
  table: 'store_expenses',
  select: '*',
  orderBy: { column: 'date', ascending: true },
  toRow: e => ({ id: e.id, expense_name: e.expenseName, price: num(e.price), date: iso(e.date), note: str(e.note) }),
  fromRow: r => ({ id: r.id, expenseName: r.expense_name, price: num(r.price), date: iso(r.date), note: str(r.note) }),
};

export const debtMapper: Mapper<Debt> = {
  table: 'debts',
  select: '*',
  orderBy: { column: 'date', ascending: true },
  toRow: d => ({
    id: d.id, name: d.name, direction: d.direction, amount: num(d.amount),
    amount_paid: num(d.amountPaid), remaining: num(d.remaining), note: str(d.note),
    is_paid: !!d.isPaid, date: iso(d.date),
  }),
  fromRow: r => ({
    id: r.id, name: r.name, direction: r.direction, amount: num(r.amount),
    amountPaid: num(r.amount_paid), remaining: num(r.remaining), note: str(r.note),
    isPaid: !!r.is_paid, date: iso(r.date),
  }),
};

export const debtPaymentMapper: Mapper<DebtPayment> = {
  table: 'debt_payments',
  select: '*, debt_payment_allocations(*)',
  orderBy: { column: 'date', ascending: true },
  toRow: d => ({
    id: d.id, party_type: d.partyType, party_id: d.partyId, party_name: str(d.partyName),
    amount: num(d.amount), date: iso(d.date), method: d.method || 'cash',
    metal_type_id: nullIfEmpty(d.metalTypeId), metal_type_name: nullIfEmpty(d.metalTypeName),
    price_per_gram: d.pricePerGram ?? null, weight: d.weight ?? null,
    invoice_id: nullIfEmpty(d.invoiceId), note: str(d.note),
    created_at: d.createdAt ? iso(d.createdAt) : undefined,
  }),
  fromRow: r => ({
    id: r.id, partyType: r.party_type, partyId: r.party_id, partyName: str(r.party_name),
    amount: num(r.amount), date: iso(r.date), method: r.method,
    metalTypeId: r.metal_type_id || undefined, metalTypeName: r.metal_type_name || undefined,
    pricePerGram: r.price_per_gram ?? undefined, weight: r.weight ?? undefined,
    invoiceId: r.invoice_id || undefined, note: str(r.note),
    allocations: (r.debt_payment_allocations || []).map((a: any) => ({
      invoiceId: a.invoice_id, amount: num(a.amount),
    })),
    createdAt: iso(r.created_at),
  }),
  children: [{
    table: 'debt_payment_allocations',
    parentKey: 'debt_payment_id',
    toRows: (d, id) => (d.allocations || []).map(a => ({
      debt_payment_id: id, invoice_id: a.invoiceId, amount: num(a.amount),
    })),
  }],
};

export const clientMapper: Mapper<Client> = {
  table: 'clients',
  select: '*, client_payments(*), client_recuperations(*)',
  toRow: c => ({ id: c.id, name: c.name, phone: str(c.phone), note: str(c.note) }),
  fromRow: r => ({
    id: r.id, name: r.name, phone: str(r.phone), note: str(r.note),
    payments: (r.client_payments || []).map((p: any) => ({ id: p.id, amount: num(p.amount), date: iso(p.date) })),
    recuperations: (r.client_recuperations || []).map((p: any) => ({ id: p.id, amount: num(p.amount), date: iso(p.date) })),
  }),
  children: [
    {
      table: 'client_payments',
      parentKey: 'client_id',
      toRows: (c, id) => (c.payments || []).map(p => ({ id: p.id, client_id: id, amount: num(p.amount), date: iso(p.date) })),
    },
    {
      table: 'client_recuperations',
      parentKey: 'client_id',
      toRows: (c, id) => (c.recuperations || []).map(p => ({ id: p.id, client_id: id, amount: num(p.amount), date: iso(p.date) })),
    },
  ],
};

export const replacementMapper: Mapper<ReplacementInvoice> = {
  table: 'replacement_invoices',
  select: '*',
  orderBy: { column: 'date', ascending: true },
  toRow: r => ({
    id: r.id, date: iso(r.date), type: r.type, worker_id: nullIfEmpty(r.workerId),
    client_name: str(r.clientName), client_phone: str(r.clientPhone),
    ret_metal_type_id: r.returnedItem?.metalTypeId,
    ret_shape: nullIfEmpty(r.returnedItem?.shape),
    ret_weight: num(r.returnedItem?.weight),
    ret_price_per_gram: num(r.returnedItem?.pricePerGram),
    ret_total_price: num(r.returnedItem?.totalPrice),
    new_metal_type_id: nullIfEmpty(r.newItem?.metalTypeId),
    new_shape: nullIfEmpty(r.newItem?.shape),
    new_weight: r.newItem ? num(r.newItem.weight) : null,
    new_price_per_gram: r.newItem ? num(r.newItem.pricePerGram) : null,
    new_total_price: r.newItem ? num(r.newItem.totalPrice) : null,
    buy_back_price_per_gram: r.buyBackPricePerGram ?? null,
    amount_difference: num(r.amountDifference), amount_to_pay: num(r.amountToPay),
    amount_to_refund: num(r.amountToRefund), note: str(r.note),
    delivery_id: nullIfEmpty(r.deliveryId), delivery_price: r.deliveryPrice ?? null,
  }),
  fromRow: r => ({
    id: r.id, date: iso(r.date), type: r.type, workerId: r.worker_id || undefined,
    clientName: str(r.client_name), clientPhone: str(r.client_phone),
    returnedItem: {
      metalTypeId: r.ret_metal_type_id, shape: r.ret_shape || undefined,
      weight: num(r.ret_weight), pricePerGram: num(r.ret_price_per_gram),
      totalPrice: num(r.ret_total_price),
    },
    newItem: r.new_metal_type_id ? {
      metalTypeId: r.new_metal_type_id, shape: r.new_shape || undefined,
      weight: num(r.new_weight), pricePerGram: num(r.new_price_per_gram),
      totalPrice: num(r.new_total_price),
    } : undefined,
    buyBackPricePerGram: r.buy_back_price_per_gram ?? undefined,
    amountDifference: num(r.amount_difference), amountToPay: num(r.amount_to_pay),
    amountToRefund: num(r.amount_to_refund), note: str(r.note),
    deliveryId: r.delivery_id || undefined, deliveryPrice: r.delivery_price ?? undefined,
  }),
};

export const cassiePurchaseMapper: Mapper<CassiePurchase> = {
  table: 'cassie_purchases',
  select: '*',
  orderBy: { column: 'date', ascending: true },
  toRow: c => ({
    id: c.id, client_name: c.clientName, client_phone: str(c.clientPhone),
    metal_type_id: c.metalTypeId, weight: num(c.weight), total_price: num(c.totalPrice),
    date: iso(c.date), is_melted: !!c.isMelted,
  }),
  fromRow: r => ({
    id: r.id, clientName: r.client_name, clientPhone: str(r.client_phone),
    metalTypeId: r.metal_type_id, weight: num(r.weight), totalPrice: num(r.total_price),
    date: iso(r.date), isMelted: !!r.is_melted,
  }),
};

export const meltingMapper: Mapper<MeltingRecord> = {
  table: 'melting_records',
  select: '*, melting_record_purchases(cassie_purchase_id)',
  orderBy: { column: 'date', ascending: true },
  toRow: m => ({
    id: m.id, date: iso(m.date), loss: num(m.loss), total_pre_weight: num(m.totalPreWeight),
    post_weight: num(m.postWeight), total_price: num(m.totalPrice),
    price_per_gram_after: num(m.pricePerGramAfter), target_metal_type_id: m.targetMetalTypeId,
  }),
  fromRow: r => ({
    id: r.id, date: iso(r.date), loss: num(r.loss), totalPreWeight: num(r.total_pre_weight),
    postWeight: num(r.post_weight), totalPrice: num(r.total_price),
    pricePerGramAfter: num(r.price_per_gram_after), targetMetalTypeId: r.target_metal_type_id,
    purchaseIds: (r.melting_record_purchases || []).map((x: any) => x.cassie_purchase_id),
  }),
  children: [{
    table: 'melting_record_purchases',
    parentKey: 'melting_record_id',
    toRows: (m, id) => (m.purchaseIds || []).map(pid => ({
      melting_record_id: id, cassie_purchase_id: pid,
    })),
  }],
};

export const webOfferMapper: Mapper<WebOffer> = {
  table: 'web_offers',
  select: '*',
  toRow: o => ({
    id: o.id, name: o.name, image: o.image, metal_type_id: nullIfEmpty(o.metalTypeId),
    calibre: str(o.calibre), form: nullIfEmpty(o.form), pricing_mode: o.pricingMode || 'perGram',
    weight: o.weight ?? null, price_per_gram: o.pricePerGram ?? null,
    total_price: num(o.totalPrice), unit_price: o.unitPrice ?? null,
    show_quantity: !!o.showQuantity, quantity: o.quantity ?? null,
    show_weight: o.showWeight !== false, is_hidden: !!o.isHidden,
    created_at: o.createdAt ? iso(o.createdAt) : undefined,
  }),
  fromRow: r => ({
    id: r.id, name: r.name, image: r.image, metalTypeId: str(r.metal_type_id),
    calibre: str(r.calibre), form: str(r.form), pricingMode: r.pricing_mode,
    weight: r.weight ?? undefined, pricePerGram: r.price_per_gram ?? undefined,
    totalPrice: num(r.total_price), unitPrice: r.unit_price ?? undefined,
    showQuantity: !!r.show_quantity, quantity: r.quantity ?? undefined,
    showWeight: r.show_weight !== false, isHidden: !!r.is_hidden,
    createdAt: iso(r.created_at),
  }),
};

export const webSpecialOfferMapper: Mapper<WebSpecialOffer> = {
  table: 'web_special_offers',
  select: '*',
  toRow: o => ({
    id: o.id, name: o.name, image: o.image, metal_type_id: nullIfEmpty(o.metalTypeId),
    calibre: str(o.calibre), form: nullIfEmpty(o.form), pricing_mode: o.pricingMode || 'perGram',
    weight: o.weight ?? null, price_per_gram: o.pricePerGram ?? null,
    original_price: num(o.originalPrice), special_price: num(o.specialPrice),
    unit_price: o.unitPrice ?? null, show_quantity: !!o.showQuantity,
    quantity: o.quantity ?? null, show_weight: o.showWeight !== false,
    is_hidden: !!o.isHidden, is_active: o.isActive !== false,
    start_date: nullIfEmpty(o.startDate), start_hour: str(o.startHour, '00:00'),
    end_date: nullIfEmpty(o.endDate), end_hour: str(o.endHour, '23:59'),
    created_at: o.createdAt ? iso(o.createdAt) : undefined,
  }),
  fromRow: r => ({
    id: r.id, name: r.name, image: r.image, metalTypeId: str(r.metal_type_id),
    calibre: str(r.calibre), form: str(r.form), pricingMode: r.pricing_mode,
    weight: r.weight ?? undefined, pricePerGram: r.price_per_gram ?? undefined,
    originalPrice: num(r.original_price), specialPrice: num(r.special_price),
    unitPrice: r.unit_price ?? undefined, showQuantity: !!r.show_quantity,
    quantity: r.quantity ?? undefined, showWeight: r.show_weight !== false,
    isHidden: !!r.is_hidden, isActive: r.is_active !== false,
    startDate: str(r.start_date), startHour: str(r.start_hour, '00:00'),
    endDate: str(r.end_date), endHour: str(r.end_hour, '23:59'),
    createdAt: iso(r.created_at),
  }),
};

export const webDeliveryCompanyMapper: Mapper<WebDeliveryCompany> = {
  table: 'web_delivery_companies',
  select: '*, web_delivery_wilayas(*)',
  toRow: c => ({ id: c.id, name: c.name, phone: str(c.phone) }),
  fromRow: r => ({
    id: r.id, name: r.name, phone: str(r.phone),
    wilayas: (r.web_delivery_wilayas || [])
      .slice()
      .sort((a: any, b: any) => a.wilaya_code - b.wilaya_code)
      .map((w: any) => ({
        wilayaCode: num(w.wilaya_code), wilayaName: str(w.wilaya_name),
        communes: w.communes || [], toBureau: num(w.to_bureau), toHome: num(w.to_home),
      })),
  }),
  children: [{
    table: 'web_delivery_wilayas',
    parentKey: 'delivery_company_id',
    toRows: (c, id) => (c.wilayas || []).map(w => ({
      delivery_company_id: id, wilaya_code: num(w.wilayaCode), wilaya_name: str(w.wilayaName),
      communes: w.communes || [], to_bureau: num(w.toBureau), to_home: num(w.toHome),
    })),
  }],
};

export const webOrderMapper: Mapper<WebOrder> = {
  table: 'web_orders',
  select: '*, web_order_items(*)',
  orderBy: { column: 'created_at', ascending: true },
  toRow: o => ({
    id: o.id, order_number: o.orderNumber, created_at: iso(o.createdAt), status: o.status,
    client_full_name: o.clientFullName, client_phone: o.clientPhone,
    client_email: nullIfEmpty(o.clientEmail), wilaya_code: num(o.wilayaCode),
    wilaya_name: str(o.wilayaName), commune: str(o.commune), address: str(o.address),
    delivery_company_id: nullIfEmpty(o.deliveryCompanyId), delivery_type: o.deliveryType || 'home',
    delivery_price: num(o.deliveryPrice), subtotal: num(o.subtotal), total: num(o.total),
    is_personalized: !!o.isPersonalized,
    pers_metal_type: nullIfEmpty(o.personalizedDetails?.metalType),
    pers_calibre: nullIfEmpty(o.personalizedDetails?.calibre),
    pers_form: nullIfEmpty(o.personalizedDetails?.form),
    pers_max_grams: o.personalizedDetails?.maxGrams ?? null,
    pers_notes: nullIfEmpty(o.personalizedDetails?.notes),
    finalized_at: o.finalizedAt ? iso(o.finalizedAt) : null,
    storage_deducted: !!o.storageDeducted,
    cancelled_at: o.cancelledAt ? iso(o.cancelledAt) : null,
  }),
  fromRow: r => ({
    id: r.id, orderNumber: r.order_number, createdAt: iso(r.created_at), status: r.status,
    clientFullName: r.client_full_name, clientPhone: r.client_phone,
    clientEmail: r.client_email || undefined, wilayaCode: num(r.wilaya_code),
    wilayaName: str(r.wilaya_name), commune: str(r.commune), address: str(r.address),
    deliveryCompanyId: str(r.delivery_company_id), deliveryType: r.delivery_type,
    deliveryPrice: num(r.delivery_price), subtotal: num(r.subtotal), total: num(r.total),
    items: (r.web_order_items || [])
      .slice()
      .sort((a: any, b: any) => a.line_no - b.line_no)
      .map((i: any) => ({
        offerId: i.offer_id || undefined, specialOfferId: i.special_offer_id || undefined,
        name: i.name, image: i.image, quantity: num(i.quantity),
        unitPrice: num(i.unit_price), totalPrice: num(i.total_price),
        metalTypeId: i.metal_type_id || undefined, calibre: i.calibre || undefined,
        form: i.form || undefined, weight: i.weight ?? undefined, size: i.size || undefined,
      })),
    isPersonalized: !!r.is_personalized,
    personalizedDetails: r.is_personalized ? {
      metalType: str(r.pers_metal_type), calibre: str(r.pers_calibre),
      form: str(r.pers_form), maxGrams: num(r.pers_max_grams),
      notes: r.pers_notes || undefined,
    } : undefined,
    finalizedAt: r.finalized_at || undefined, storageDeducted: !!r.storage_deducted,
    cancelledAt: r.cancelled_at || undefined,
  }),
  children: [{
    table: 'web_order_items',
    parentKey: 'web_order_id',
    toRows: (o, id) => (o.items || []).map((i, n) => ({
      web_order_id: id, offer_id: nullIfEmpty(i.offerId),
      special_offer_id: nullIfEmpty(i.specialOfferId), name: i.name, image: i.image,
      quantity: num(i.quantity, 1), unit_price: num(i.unitPrice), total_price: num(i.totalPrice),
      metal_type_id: nullIfEmpty(i.metalTypeId), calibre: nullIfEmpty(i.calibre),
      form: nullIfEmpty(i.form), weight: i.weight ?? null, size: nullIfEmpty(i.size),
      line_no: n,
    })),
  }],
};

// ════════════════════════════════════════════════════════════════════════════
//  GENERIC READ / WRITE
// ════════════════════════════════════════════════════════════════════════════

/** Loads an entire table (with its children) and maps it back to app objects. */
export const fetchAll = async <T>(m: Mapper<T>): Promise<T[]> => {
  let q = supabase.from(m.table).select(m.select);
  if (m.orderBy) q = q.order(m.orderBy.column, { ascending: m.orderBy.ascending !== false });
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(m.fromRow);
};

/** Writes one object and replaces its child rows. */
export const saveOne = async <T extends { id: string }>(m: Mapper<T>, obj: T): Promise<void> => {
  const row = m.toRow(obj);
  Object.keys(row).forEach(k => row[k] === undefined && delete row[k]);

  const { error } = await supabase.from(m.table).upsert(row, { onConflict: 'id' });
  if (error) throw error;

  for (const child of m.children || []) {
    // Children are value objects with no stable identity of their own, so the
    // simplest correct write is to replace the whole set for this parent.
    const { error: delErr } = await supabase.from(child.table).delete().eq(child.parentKey, obj.id);
    if (delErr) throw delErr;

    const rows = child.toRows(obj, obj.id);
    if (rows.length) {
      const { error: insErr } = await supabase.from(child.table).insert(rows);
      if (insErr) throw insErr;
    }
  }
};

export const deleteOne = async <T>(m: Mapper<T>, id: string): Promise<void> => {
  const { error } = await supabase.from(m.table).delete().eq('id', id);
  if (error) throw error;
};

/**
 * Mirrors a whole collection: whatever changed between `prev` and `next` is
 * written, whatever disappeared is deleted. This is what lets every existing
 * `setXxx(prev => …)` call in AppContext persist without being rewritten.
 */
export const syncCollection = async <T extends { id: string }>(
  m: Mapper<T>, prev: T[], next: T[]
): Promise<void> => {
  const prevById = new Map(prev.map(x => [x.id, x]));
  const nextById = new Map(next.map(x => [x.id, x]));

  for (const [id] of prevById) {
    if (!nextById.has(id)) await deleteOne(m, id);
  }
  for (const [id, obj] of nextById) {
    const before = prevById.get(id);
    if (!before || JSON.stringify(before) !== JSON.stringify(obj)) {
      await saveOne(m, obj);
    }
  }
};

// ─── Singletons & plain value lists ─────────────────────────────────────────

/** Columns of store_settings that are real columns; the rest go to jsonb. */
const SETTINGS_COLUMNS = ['logo', 'storeName', 'slogan', 'contact', 'phone', 'address'] as const;

export const fetchSettings = async (): Promise<{ settings: StoreSettings; minimalWeight: number } | null> => {
  const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    settings: {
      logo: data.logo, storeName: str(data.store_name, 'Bijouterie'), slogan: str(data.slogan),
      contact: str(data.contact), phone: str(data.phone), address: str(data.address),
      ...(data.website_content || {}),
    },
    minimalWeight: num(data.minimal_weight),
  };
};

export const saveSettings = async (s: StoreSettings, minimalWeight: number): Promise<void> => {
  const websiteContent: Record<string, any> = {};
  Object.entries(s).forEach(([k, v]) => {
    if (!SETTINGS_COLUMNS.includes(k as any)) websiteContent[k] = v;
  });
  const { error } = await supabase.from('store_settings').upsert({
    id: 1, logo: s.logo ?? null, store_name: str(s.storeName, 'Bijouterie'),
    slogan: str(s.slogan), contact: str(s.contact), phone: str(s.phone),
    address: str(s.address), minimal_weight: num(minimalWeight),
    website_content: websiteContent,
  }, { onConflict: 'id' });
  if (error) throw error;
};

export const fetchWebContacts = async (): Promise<WebContacts | null> => {
  const { data, error } = await supabase.from('web_contacts').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { id, updated_at, ...rest } = data;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v != null)) as WebContacts;
};

export const saveWebContacts = async (c: WebContacts): Promise<void> => {
  const { error } = await supabase.from('web_contacts').upsert({ id: 1, ...c }, { onConflict: 'id' });
  if (error) throw error;
};

// ─── Public storefront reads ────────────────────────────────────────────────
// Visitors must be able to label a piece ("Or 18k") without being told how many
// grams are in the safe, so they read label-only views instead of the tables.
// Stock fields come back as zero, which the storefront never displays.

export const fetchPublicCategories = async (): Promise<MetalCategory[]> => {
  const { data, error } = await supabase.from('public_metal_categories').select('*');
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id, name: r.name, nameAr: str(r.name_ar), color: str(r.color, '#8FA0B4'),
    calibres: r.calibres || [], pricePerGram: 0,
  }));
};

export const fetchPublicMetalTypes = async (): Promise<MetalType[]> => {
  const { data, error } = await supabase.from('public_metal_types').select('*');
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id, name: r.name, metalCategoryId: r.metal_category_id,
    calibre: str(r.calibre), initialQuantity: 0, isCassie: false,
    isAlaPiece: !!r.is_ala_piece, shapes: {},
  }));
};

/** shapes / calibres are plain string lists backed by a one-column table. */
export const fetchValueList = async (table: string, column: string, order?: string): Promise<string[]> => {
  let q = supabase.from(table).select(column);
  if (order) q = q.order(order, { ascending: true });
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((r: any) => r[column]);
};

export const syncValueList = async (
  table: string, column: string, prev: string[], next: string[]
): Promise<void> => {
  const removed = prev.filter(v => !next.includes(v));
  const added = next.filter(v => !prev.includes(v));
  if (removed.length) {
    const { error } = await supabase.from(table).delete().in(column, removed);
    if (error) throw error;
  }
  if (added.length) {
    const rows = added.map((v, i) => (column === 'name'
      ? { name: v, sort_order: prev.length + i }
      : { [column]: v }));
    const { error } = await supabase.from(table).upsert(rows, { onConflict: column });
    if (error) throw error;
  }
};

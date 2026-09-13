/**
 * ─── PERMISSION KEYS ─────────────────────────────────────────────────────────
 * The mirror image of `public.app_permissions` (supabase/06_seed.sql). The UI
 * hides what the worker was not granted; Postgres refuses it as well, so the
 * two can never drift apart.
 *
 * Naming: `<module>.view` unlocks the screen, everything else unlocks a button.
 */

export type PermissionKind = 'interface' | 'action';

export interface PermissionDef {
  key: string;
  kind: PermissionKind;
  module: string;
  labelFr: string;
  labelAr: string;
}

const p = (key: string, kind: PermissionKind, module: string, labelFr: string, labelAr: string): PermissionDef =>
  ({ key, kind, module, labelFr, labelAr });

export const PERMISSIONS: PermissionDef[] = [
  // 1. Tableau de bord
  p('dashboard.view', 'interface', 'dashboard', 'Tableau de bord', 'لوحة التحكم'),

  // 2. Point de vente
  p('pos.view',   'interface', 'pos', 'Point de vente', 'نقطة البيع'),
  p('pos.create', 'action',    'pos', 'Valider une vente', 'تأكيد البيع'),
  p('pos.print',  'action',    'pos', 'Imprimer le ticket', 'طباعة الوصل'),

  // 3. Inventaire
  p('inventory.view',   'interface', 'inventory', 'Inventaire', 'المخزون'),
  p('inventory.adjust', 'action',    'inventory', 'Ajuster le stock', 'تعديل المخزون'),

  // 4. Remplacements
  p('replacements.view',   'interface', 'replacements', 'Remplacements', 'الاستبدالات'),
  p('replacements.create', 'action',    'replacements', 'Nouveau remplacement', 'استبدال جديد'),
  p('replacements.edit',   'action',    'replacements', 'Modifier un remplacement', 'تعديل الاستبدال'),
  p('replacements.delete', 'action',    'replacements', 'Supprimer un remplacement', 'حذف الاستبدال'),

  // 5. Clients
  p('clients.view',                'interface', 'clients', 'Clients', 'الزبائن'),
  p('clients.create',              'action',    'clients', 'Ajouter un client', 'إضافة زبون'),
  p('clients.edit',                'action',    'clients', 'Modifier un client', 'تعديل زبون'),
  p('clients.delete',              'action',    'clients', 'Supprimer un client', 'حذف زبون'),
  p('clients.payment.create',      'action',    'clients', 'Enregistrer un versement', 'تسجيل دفعة'),
  p('clients.payment.edit',        'action',    'clients', 'Modifier un versement', 'تعديل دفعة'),
  p('clients.payment.delete',      'action',    'clients', 'Supprimer un versement', 'حذف دفعة'),
  p('clients.recuperation.create', 'action',    'clients', 'Enregistrer une récupération', 'تسجيل استرجاع'),
  p('clients.recuperation.edit',   'action',    'clients', 'Modifier une récupération', 'تعديل استرجاع'),
  p('clients.recuperation.delete', 'action',    'clients', 'Supprimer une récupération', 'حذف استرجاع'),
  p('clients.print',               'action',    'clients', "Imprimer l'historique", 'طباعة السجل'),

  // 6. Fournisseurs
  p('suppliers.view',   'interface', 'suppliers', 'Fournisseurs', 'الموردون'),
  p('suppliers.create', 'action',    'suppliers', 'Ajouter un fournisseur', 'إضافة مورد'),
  p('suppliers.edit',   'action',    'suppliers', 'Modifier un fournisseur', 'تعديل مورد'),
  p('suppliers.delete', 'action',    'suppliers', 'Supprimer un fournisseur', 'حذف مورد'),

  // 7. Achats
  p('purchases.view',   'interface', 'purchases', 'Achats', 'المشتريات'),
  p('purchases.create', 'action',    'purchases', "Nouvelle facture d'achat", 'فاتورة شراء جديدة'),
  p('purchases.edit',   'action',    'purchases', 'Modifier une facture', 'تعديل الفاتورة'),
  p('purchases.delete', 'action',    'purchases', 'Supprimer une facture', 'حذف الفاتورة'),
  p('purchases.print',  'action',    'purchases', 'Imprimer une facture', 'طباعة الفاتورة'),

  // 8. Achats Cassie
  p('cassiePurchases.view',        'interface', 'cassiePurchases', 'Achats Cassie', 'شراء الكسر'),
  p('cassiePurchases.create',      'action',    'cassiePurchases', 'Acheter de la cassie', 'شراء كسر'),
  p('cassiePurchases.edit',        'action',    'cassiePurchases', 'Modifier un achat', 'تعديل الشراء'),
  p('cassiePurchases.delete',      'action',    'cassiePurchases', 'Supprimer un achat', 'حذف الشراء'),
  p('cassiePurchases.melt',        'action',    'cassiePurchases', 'Lancer une fonte', 'صهر'),
  p('cassiePurchases.melt.edit',   'action',    'cassiePurchases', 'Modifier une fonte', 'تعديل الصهر'),
  p('cassiePurchases.melt.delete', 'action',    'cassiePurchases', 'Supprimer une fonte', 'حذف الصهر'),

  // 9. Factures de vente
  p('sellingInvoices.view',    'interface', 'sellingInvoices', 'Factures de vente', 'فواتير البيع'),
  p('sellingInvoices.viewAll', 'action',    'sellingInvoices', 'Voir les factures de tous', 'عرض كل الفواتير'),
  p('sellingInvoices.edit',    'action',    'sellingInvoices', 'Modifier une facture', 'تعديل الفاتورة'),
  p('sellingInvoices.delete',  'action',    'sellingInvoices', 'Supprimer une facture', 'حذف الفاتورة'),
  p('sellingInvoices.print',   'action',    'sellingInvoices', 'Imprimer une facture', 'طباعة الفاتورة'),

  // 10. Ateliers
  p('workshops.view',   'interface', 'workshops', 'Ateliers', 'الورشات'),
  p('workshops.create', 'action',    'workshops', 'Ajouter un atelier', 'إضافة ورشة'),
  p('workshops.edit',   'action',    'workshops', 'Modifier un atelier', 'تعديل ورشة'),
  p('workshops.delete', 'action',    'workshops', 'Supprimer un atelier', 'حذف ورشة'),

  // 11. Livreurs
  p('deliveries.view',           'interface', 'deliveries', 'Livreurs', 'الموصلون'),
  p('deliveries.create',         'action',    'deliveries', 'Ajouter un livreur', 'إضافة موصل'),
  p('deliveries.edit',           'action',    'deliveries', 'Modifier un livreur', 'تعديل موصل'),
  p('deliveries.delete',         'action',    'deliveries', 'Supprimer un livreur', 'حذف موصل'),
  p('deliveries.payment.create', 'action',    'deliveries', 'Enregistrer un paiement', 'تسجيل دفعة'),
  p('deliveries.payment.delete', 'action',    'deliveries', 'Supprimer un paiement', 'حذف دفعة'),

  // 12. Commandes atelier
  p('commands.view',     'interface', 'commands', 'Commandes', 'الطلبيات'),
  p('commands.create',   'action',    'commands', 'Nouvelle commande', 'طلبية جديدة'),
  p('commands.edit',     'action',    'commands', 'Modifier une commande', 'تعديل طلبية'),
  p('commands.delete',   'action',    'commands', 'Supprimer une commande', 'حذف طلبية'),
  p('commands.finalize', 'action',    'commands', 'Finaliser une commande', 'إنهاء الطلبية'),
  p('commands.print',    'action',    'commands', 'Imprimer une commande', 'طباعة الطلبية'),

  // 13. Employés
  p('workers.view',               'interface', 'workers', 'Employés', 'الموظفون'),
  p('workers.create',             'action',    'workers', 'Créer un compte employé', 'إنشاء حساب موظف'),
  p('workers.edit',               'action',    'workers', 'Modifier un employé', 'تعديل موظف'),
  p('workers.delete',             'action',    'workers', 'Supprimer un employé', 'حذف موظف'),
  p('workers.advance.create',     'action',    'workers', 'Enregistrer une avance', 'تسجيل سلفة'),
  p('workers.absence.create',     'action',    'workers', 'Enregistrer une absence', 'تسجيل غياب'),
  p('workers.payment.create',     'action',    'workers', 'Payer un salaire', 'دفع الراتب'),
  p('workers.permissions.manage', 'action',    'workers', 'Gérer les permissions', 'إدارة الصلاحيات'),

  // 14. Mes paiements
  p('myPayroll.view', 'interface', 'myPayroll', 'Mes paiements', 'مستحقاتي'),

  // 15. Dépenses
  p('storeExpenses.view',   'interface', 'storeExpenses', 'Dépenses', 'المصاريف'),
  p('storeExpenses.create', 'action',    'storeExpenses', 'Ajouter une dépense', 'إضافة مصروف'),
  p('storeExpenses.edit',   'action',    'storeExpenses', 'Modifier une dépense', 'تعديل مصروف'),
  p('storeExpenses.delete', 'action',    'storeExpenses', 'Supprimer une dépense', 'حذف مصروف'),

  // 16. Trésorerie
  p('storeCash.view', 'interface', 'storeCash', 'Trésorerie', 'خزينة المتجر'),

  // 17. Dettes
  p('debts.view',           'interface', 'debts', 'Dettes', 'الديون'),
  p('debts.create',         'action',    'debts', 'Ajouter une dette', 'إضافة دين'),
  p('debts.edit',           'action',    'debts', 'Modifier une dette', 'تعديل دين'),
  p('debts.delete',         'action',    'debts', 'Supprimer une dette', 'حذف دين'),
  p('debts.pay',            'action',    'debts', 'Rembourser une dette', 'تسديد دين'),
  p('debts.payment.edit',   'action',    'debts', 'Modifier un remboursement', 'تعديل تسديد'),
  p('debts.payment.delete', 'action',    'debts', 'Supprimer un remboursement', 'حذف تسديد'),
  p('debts.print',          'action',    'debts', 'Imprimer le relevé', 'طباعة الكشف'),

  // 18. Rapports
  p('reports.view',  'interface', 'reports', 'Rapports', 'التقارير'),
  p('reports.print', 'action',    'reports', 'Imprimer / exporter', 'طباعة أو تصدير'),

  // 19. Gestion du site web
  p('websiteManagement.view',            'interface', 'websiteManagement', 'Gestion site web', 'إدارة الموقع'),
  p('websiteManagement.offer.create',    'action',    'websiteManagement', 'Créer une offre', 'إنشاء عرض'),
  p('websiteManagement.offer.edit',      'action',    'websiteManagement', 'Modifier une offre', 'تعديل عرض'),
  p('websiteManagement.offer.delete',    'action',    'websiteManagement', 'Supprimer une offre', 'حذف عرض'),
  p('websiteManagement.special.create',  'action',    'websiteManagement', 'Créer une offre spéciale', 'إنشاء عرض خاص'),
  p('websiteManagement.special.edit',    'action',    'websiteManagement', 'Modifier une offre spéciale', 'تعديل عرض خاص'),
  p('websiteManagement.special.delete',  'action',    'websiteManagement', 'Supprimer une offre spéciale', 'حذف عرض خاص'),
  p('websiteManagement.delivery.create', 'action',    'websiteManagement', 'Ajouter une société de livraison', 'إضافة شركة توصيل'),
  p('websiteManagement.delivery.edit',   'action',    'websiteManagement', 'Modifier une société de livraison', 'تعديل شركة توصيل'),
  p('websiteManagement.delivery.delete', 'action',    'websiteManagement', 'Supprimer une société de livraison', 'حذف شركة توصيل'),
  p('websiteManagement.contacts.edit',   'action',    'websiteManagement', 'Modifier les contacts', 'تعديل جهات الاتصال'),
  p('websiteManagement.content.edit',    'action',    'websiteManagement', 'Modifier le contenu du site', 'تعديل محتوى الموقع'),

  // 20. Commandes du site
  p('websiteOrders.view',     'interface', 'websiteOrders', 'Commandes du site', 'طلبات الموقع'),
  p('websiteOrders.accept',   'action',    'websiteOrders', 'Accepter une commande', 'قبول الطلب'),
  p('websiteOrders.status',   'action',    'websiteOrders', 'Changer le statut', 'تغيير الحالة'),
  p('websiteOrders.finalize', 'action',    'websiteOrders', 'Finaliser (déduire du stock)', 'إنهاء وخصم المخزون'),
  p('websiteOrders.cancel',   'action',    'websiteOrders', 'Annuler une commande', 'إلغاء الطلب'),
  p('websiteOrders.delete',   'action',    'websiteOrders', 'Supprimer une commande', 'حذف الطلب'),

  // 21. Catalogue
  p('catalogue.view',            'interface', 'catalogue', 'Catalogue', 'الكتالوج'),
  p('catalogue.create',          'action',    'catalogue', 'Ajouter au catalogue', 'إضافة للكتالوج'),
  p('catalogue.edit',            'action',    'catalogue', 'Modifier le catalogue', 'تعديل الكتالوج'),
  p('catalogue.delete',          'action',    'catalogue', 'Supprimer du catalogue', 'حذف من الكتالوج'),
  p('catalogue.category.manage', 'action',    'catalogue', 'Gérer les catégories de métal', 'إدارة فئات المعادن'),
  p('catalogue.type.manage',     'action',    'catalogue', 'Gérer les types de stock', 'إدارة أنواع المخزون'),
  p('catalogue.shape.manage',    'action',    'catalogue', 'Gérer les formes', 'إدارة الأشكال'),
  p('catalogue.calibre.manage',  'action',    'catalogue', 'Gérer les calibres', 'إدارة العيارات'),

  // 22. Paramètres
  p('settings.view',          'interface', 'settings', 'Paramètres', 'الإعدادات'),
  p('settings.store.edit',    'action',    'settings', "Modifier l'identité du magasin", 'تعديل هوية المتجر'),
  p('settings.backup.export', 'action',    'settings', 'Exporter une sauvegarde', 'تصدير نسخة احتياطية'),
  p('settings.backup.import', 'action',    'settings', 'Restaurer une sauvegarde', 'استعادة نسخة احتياطية'),
  p('settings.reset',         'action',    'settings', 'Réinitialiser les données', 'إعادة تعيين البيانات'),
];

/** Human label for a module, used as the group heading on the Employés screen. */
export const MODULE_LABELS: Record<string, { fr: string; ar: string }> = {
  dashboard:         { fr: 'Tableau de bord',    ar: 'لوحة التحكم' },
  pos:               { fr: 'Point de vente',     ar: 'نقطة البيع' },
  inventory:         { fr: 'Inventaire',         ar: 'المخزون' },
  replacements:      { fr: 'Remplacements',      ar: 'الاستبدالات' },
  clients:           { fr: 'Clients',            ar: 'الزبائن' },
  suppliers:         { fr: 'Fournisseurs',       ar: 'الموردون' },
  purchases:         { fr: 'Achats',             ar: 'المشتريات' },
  cassiePurchases:   { fr: 'Achats Cassie',      ar: 'شراء الكسر' },
  sellingInvoices:   { fr: 'Factures de vente',  ar: 'فواتير البيع' },
  workshops:         { fr: 'Ateliers',           ar: 'الورشات' },
  deliveries:        { fr: 'Livreurs',           ar: 'الموصلون' },
  commands:          { fr: 'Commandes',          ar: 'الطلبيات' },
  workers:           { fr: 'Employés',           ar: 'الموظفون' },
  myPayroll:         { fr: 'Mes paiements',      ar: 'مستحقاتي' },
  storeExpenses:     { fr: 'Dépenses',           ar: 'المصاريف' },
  storeCash:         { fr: 'Trésorerie',         ar: 'خزينة المتجر' },
  debts:             { fr: 'Dettes',             ar: 'الديون' },
  reports:           { fr: 'Rapports',           ar: 'التقارير' },
  websiteManagement: { fr: 'Gestion site web',   ar: 'إدارة الموقع' },
  websiteOrders:     { fr: 'Commandes du site',  ar: 'طلبات الموقع' },
  catalogue:         { fr: 'Catalogue',          ar: 'الكتالوج' },
  settings:          { fr: 'Paramètres',         ar: 'الإعدادات' },
};

/** The order modules appear in on the permission editor. */
export const MODULE_ORDER = Object.keys(MODULE_LABELS);

/** Permissions grouped by module, ready to render as a tick-list. */
export const permissionsByModule = (): { module: string; items: PermissionDef[] }[] =>
  MODULE_ORDER
    .map(module => ({ module, items: PERMISSIONS.filter(x => x.module === module) }))
    .filter(g => g.items.length > 0);

/** What a freshly created employee gets — mirrors default_worker_permissions. */
export const DEFAULT_WORKER_PERMISSIONS: string[] = [
  'dashboard.view',
  'pos.view', 'pos.create', 'pos.print',
  'sellingInvoices.view', 'sellingInvoices.print',
  'clients.view', 'clients.create',
  'myPayroll.view',
  'settings.view',
];

/** Every key — what an administrator implicitly holds. */
export const ALL_PERMISSION_KEYS: string[] = PERMISSIONS.map(x => x.key);

/** The `*.view` key that unlocks a given sidebar tab. */
export const viewKeyFor = (module: string): string => `${module}.view`;

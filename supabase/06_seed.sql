-- ════════════════════════════════════════════════════════════════════════════
--  BIJOUTERIE BEJAIA — Part 6/6 : the permission catalogue + base data
--
--  Below is the complete map of the application: 22 interfaces (`*.view`) and
--  every mutating button behind them. An administrator ticks these per worker
--  on the Employés screen; the sidebar hides what is not ticked and Postgres
--  refuses it even if someone calls the API directly.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.app_permissions (key, kind, module, label_fr, label_ar, sort_order) values

-- ─── 1. TABLEAU DE BORD ─────────────────────────────────────────────────────
('dashboard.view',                'interface','dashboard','Tableau de bord','لوحة التحكم',100),

-- ─── 2. POINT DE VENTE ──────────────────────────────────────────────────────
('pos.view',                      'interface','pos','Point de vente','نقطة البيع',200),
('pos.create',                    'action','pos','Valider une vente','تأكيد البيع',201),
('pos.print',                     'action','pos','Imprimer le ticket','طباعة الوصل',202),

-- ─── 3. INVENTAIRE ──────────────────────────────────────────────────────────
('inventory.view',                'interface','inventory','Inventaire','المخزون',300),
('inventory.adjust',              'action','inventory','Ajuster le stock','تعديل المخزون',301),

-- ─── 4. REMPLACEMENTS / REPRISES ────────────────────────────────────────────
('replacements.view',             'interface','replacements','Remplacements','الاستبدالات',400),
('replacements.create',           'action','replacements','Nouveau remplacement','استبدال جديد',401),
('replacements.edit',             'action','replacements','Modifier un remplacement','تعديل الاستبدال',402),
('replacements.delete',           'action','replacements','Supprimer un remplacement','حذف الاستبدال',403),

-- ─── 5. CLIENTS ─────────────────────────────────────────────────────────────
('clients.view',                  'interface','clients','Clients','الزبائن',500),
('clients.create',                'action','clients','Ajouter un client','إضافة زبون',501),
('clients.edit',                  'action','clients','Modifier un client','تعديل زبون',502),
('clients.delete',                'action','clients','Supprimer un client','حذف زبون',503),
('clients.payment.create',        'action','clients','Enregistrer un versement','تسجيل دفعة',504),
('clients.payment.edit',          'action','clients','Modifier un versement','تعديل دفعة',505),
('clients.payment.delete',        'action','clients','Supprimer un versement','حذف دفعة',506),
('clients.recuperation.create',   'action','clients','Enregistrer une récupération','تسجيل استرجاع',507),
('clients.recuperation.edit',     'action','clients','Modifier une récupération','تعديل استرجاع',508),
('clients.recuperation.delete',   'action','clients','Supprimer une récupération','حذف استرجاع',509),
('clients.print',                 'action','clients','Imprimer l''historique','طباعة السجل',510),

-- ─── 6. FOURNISSEURS ────────────────────────────────────────────────────────
('suppliers.view',                'interface','suppliers','Fournisseurs','الموردون',600),
('suppliers.create',              'action','suppliers','Ajouter un fournisseur','إضافة مورد',601),
('suppliers.edit',                'action','suppliers','Modifier un fournisseur','تعديل مورد',602),
('suppliers.delete',              'action','suppliers','Supprimer un fournisseur','حذف مورد',603),

-- ─── 7. ACHATS ──────────────────────────────────────────────────────────────
('purchases.view',                'interface','purchases','Achats','المشتريات',700),
('purchases.create',              'action','purchases','Nouvelle facture d''achat','فاتورة شراء جديدة',701),
('purchases.edit',                'action','purchases','Modifier une facture','تعديل الفاتورة',702),
('purchases.delete',              'action','purchases','Supprimer une facture','حذف الفاتورة',703),
('purchases.print',               'action','purchases','Imprimer une facture','طباعة الفاتورة',704),

-- ─── 8. ACHATS CASSIE (métal de récupération) ───────────────────────────────
('cassiePurchases.view',          'interface','cassiePurchases','Achats Cassie','شراء الكسر',800),
('cassiePurchases.create',        'action','cassiePurchases','Acheter de la cassie','شراء كسر',801),
('cassiePurchases.edit',          'action','cassiePurchases','Modifier un achat','تعديل الشراء',802),
('cassiePurchases.delete',        'action','cassiePurchases','Supprimer un achat','حذف الشراء',803),
('cassiePurchases.melt',          'action','cassiePurchases','Lancer une fonte','صهر',804),
('cassiePurchases.melt.edit',     'action','cassiePurchases','Modifier une fonte','تعديل الصهر',805),
('cassiePurchases.melt.delete',   'action','cassiePurchases','Supprimer une fonte','حذف الصهر',806),

-- ─── 9. FACTURES DE VENTE ───────────────────────────────────────────────────
('sellingInvoices.view',          'interface','sellingInvoices','Factures de vente','فواتير البيع',900),
('sellingInvoices.viewAll',       'action','sellingInvoices','Voir les factures de tous','عرض كل الفواتير',901),
('sellingInvoices.edit',          'action','sellingInvoices','Modifier une facture','تعديل الفاتورة',902),
('sellingInvoices.delete',        'action','sellingInvoices','Supprimer une facture','حذف الفاتورة',903),
('sellingInvoices.print',         'action','sellingInvoices','Imprimer une facture','طباعة الفاتورة',904),

-- ─── 10. ATELIERS ───────────────────────────────────────────────────────────
('workshops.view',                'interface','workshops','Ateliers','الورشات',1000),
('workshops.create',              'action','workshops','Ajouter un atelier','إضافة ورشة',1001),
('workshops.edit',                'action','workshops','Modifier un atelier','تعديل ورشة',1002),
('workshops.delete',              'action','workshops','Supprimer un atelier','حذف ورشة',1003),

-- ─── 11. LIVREURS ───────────────────────────────────────────────────────────
('deliveries.view',               'interface','deliveries','Livreurs','الموصلون',1100),
('deliveries.create',             'action','deliveries','Ajouter un livreur','إضافة موصل',1101),
('deliveries.edit',               'action','deliveries','Modifier un livreur','تعديل موصل',1102),
('deliveries.delete',             'action','deliveries','Supprimer un livreur','حذف موصل',1103),
('deliveries.payment.create',     'action','deliveries','Enregistrer un paiement','تسجيل دفعة',1104),
('deliveries.payment.delete',     'action','deliveries','Supprimer un paiement','حذف دفعة',1105),

-- ─── 12. COMMANDES ATELIER ──────────────────────────────────────────────────
('commands.view',                 'interface','commands','Commandes','الطلبيات',1200),
('commands.create',               'action','commands','Nouvelle commande','طلبية جديدة',1201),
('commands.edit',                 'action','commands','Modifier une commande','تعديل طلبية',1202),
('commands.delete',               'action','commands','Supprimer une commande','حذف طلبية',1203),
('commands.finalize',             'action','commands','Finaliser une commande','إنهاء الطلبية',1204),
('commands.print',                'action','commands','Imprimer une commande','طباعة الطلبية',1205),

-- ─── 13. EMPLOYÉS ───────────────────────────────────────────────────────────
('workers.view',                  'interface','workers','Employés','الموظفون',1300),
('workers.create',                'action','workers','Créer un compte employé','إنشاء حساب موظف',1301),
('workers.edit',                  'action','workers','Modifier un employé','تعديل موظف',1302),
('workers.delete',                'action','workers','Supprimer un employé','حذف موظف',1303),
('workers.advance.create',        'action','workers','Enregistrer une avance','تسجيل سلفة',1304),
('workers.absence.create',        'action','workers','Enregistrer une absence','تسجيل غياب',1305),
('workers.payment.create',        'action','workers','Payer un salaire','دفع الراتب',1306),
('workers.permissions.manage',    'action','workers','Gérer les permissions','إدارة الصلاحيات',1307),

-- ─── 14. MES PAIEMENTS (espace employé) ─────────────────────────────────────
('myPayroll.view',                'interface','myPayroll','Mes paiements','مستحقاتي',1400),

-- ─── 15. DÉPENSES DU MAGASIN ────────────────────────────────────────────────
('storeExpenses.view',            'interface','storeExpenses','Dépenses','المصاريف',1500),
('storeExpenses.create',          'action','storeExpenses','Ajouter une dépense','إضافة مصروف',1501),
('storeExpenses.edit',            'action','storeExpenses','Modifier une dépense','تعديل مصروف',1502),
('storeExpenses.delete',          'action','storeExpenses','Supprimer une dépense','حذف مصروف',1503),

-- ─── 16. TRÉSORERIE ─────────────────────────────────────────────────────────
('storeCash.view',                'interface','storeCash','Trésorerie','خزينة المتجر',1600),

-- ─── 17. DETTES ─────────────────────────────────────────────────────────────
('debts.view',                    'interface','debts','Dettes','الديون',1700),
('debts.create',                  'action','debts','Ajouter une dette','إضافة دين',1701),
('debts.edit',                    'action','debts','Modifier une dette','تعديل دين',1702),
('debts.delete',                  'action','debts','Supprimer une dette','حذف دين',1703),
('debts.pay',                     'action','debts','Rembourser une dette','تسديد دين',1704),
('debts.payment.edit',            'action','debts','Modifier un remboursement','تعديل تسديد',1705),
('debts.payment.delete',          'action','debts','Supprimer un remboursement','حذف تسديد',1706),
('debts.print',                   'action','debts','Imprimer le relevé','طباعة الكشف',1707),

-- ─── 18. RAPPORTS ───────────────────────────────────────────────────────────
('reports.view',                  'interface','reports','Rapports','التقارير',1800),
('reports.print',                 'action','reports','Imprimer / exporter','طباعة أو تصدير',1801),

-- ─── 19. GESTION DU SITE WEB ────────────────────────────────────────────────
('websiteManagement.view',            'interface','websiteManagement','Gestion site web','إدارة الموقع',1900),
('websiteManagement.offer.create',    'action','websiteManagement','Créer une offre','إنشاء عرض',1901),
('websiteManagement.offer.edit',      'action','websiteManagement','Modifier une offre','تعديل عرض',1902),
('websiteManagement.offer.delete',    'action','websiteManagement','Supprimer une offre','حذف عرض',1903),
('websiteManagement.special.create',  'action','websiteManagement','Créer une offre spéciale','إنشاء عرض خاص',1904),
('websiteManagement.special.edit',    'action','websiteManagement','Modifier une offre spéciale','تعديل عرض خاص',1905),
('websiteManagement.special.delete',  'action','websiteManagement','Supprimer une offre spéciale','حذف عرض خاص',1906),
('websiteManagement.delivery.create', 'action','websiteManagement','Ajouter une société de livraison','إضافة شركة توصيل',1907),
('websiteManagement.delivery.edit',   'action','websiteManagement','Modifier une société de livraison','تعديل شركة توصيل',1908),
('websiteManagement.delivery.delete', 'action','websiteManagement','Supprimer une société de livraison','حذف شركة توصيل',1909),
('websiteManagement.contacts.edit',   'action','websiteManagement','Modifier les contacts','تعديل جهات الاتصال',1910),
('websiteManagement.content.edit',    'action','websiteManagement','Modifier le contenu du site','تعديل محتوى الموقع',1911),

-- ─── 20. COMMANDES DU SITE ──────────────────────────────────────────────────
('websiteOrders.view',            'interface','websiteOrders','Commandes du site','طلبات الموقع',2000),
('websiteOrders.accept',          'action','websiteOrders','Accepter une commande','قبول الطلب',2001),
('websiteOrders.status',          'action','websiteOrders','Changer le statut','تغيير الحالة',2002),
('websiteOrders.finalize',        'action','websiteOrders','Finaliser (déduire du stock)','إنهاء وخصم المخزون',2003),
('websiteOrders.cancel',          'action','websiteOrders','Annuler une commande','إلغاء الطلب',2004),
('websiteOrders.delete',          'action','websiteOrders','Supprimer une commande','حذف الطلب',2005),

-- ─── 21. CATALOGUE ──────────────────────────────────────────────────────────
('catalogue.view',                'interface','catalogue','Catalogue','الكتالوج',2100),
('catalogue.create',              'action','catalogue','Ajouter au catalogue','إضافة للكتالوج',2101),
('catalogue.edit',                'action','catalogue','Modifier le catalogue','تعديل الكتالوج',2102),
('catalogue.delete',              'action','catalogue','Supprimer du catalogue','حذف من الكتالوج',2103),
('catalogue.category.manage',     'action','catalogue','Gérer les catégories de métal','إدارة فئات المعادن',2104),
('catalogue.type.manage',         'action','catalogue','Gérer les types de stock','إدارة أنواع المخزون',2105),
('catalogue.shape.manage',        'action','catalogue','Gérer les formes','إدارة الأشكال',2106),
('catalogue.calibre.manage',      'action','catalogue','Gérer les calibres','إدارة العيارات',2107),

-- ─── 22. PARAMÈTRES ─────────────────────────────────────────────────────────
('settings.view',                 'interface','settings','Paramètres','الإعدادات',2200),
('settings.store.edit',           'action','settings','Modifier l''identité du magasin','تعديل هوية المتجر',2201),
('settings.backup.export',        'action','settings','Exporter une sauvegarde','تصدير نسخة احتياطية',2202),
('settings.backup.import',        'action','settings','Restaurer une sauvegarde','استعادة نسخة احتياطية',2203),
('settings.reset',                'action','settings','Réinitialiser les données','إعادة تعيين البيانات',2204)

on conflict (key) do update
  set kind = excluded.kind, module = excluded.module,
      label_fr = excluded.label_fr, label_ar = excluded.label_ar,
      sort_order = excluded.sort_order;

-- ─── What a brand-new employee gets before the admin customises it ──────────
-- Deliberately thin: sell, look up clients, see their own payslip.
insert into public.default_worker_permissions (permission_key) values
  ('dashboard.view'),
  ('pos.view'), ('pos.create'), ('pos.print'),
  ('sellingInvoices.view'), ('sellingInvoices.print'),
  ('clients.view'), ('clients.create'),
  ('myPayroll.view'),
  ('settings.view')
on conflict do nothing;

-- ─── Built-in metal families (Or / Argent cannot be deleted) ────────────────
insert into public.metal_categories (id, name, name_ar, color, calibres, price_per_gram, is_built_in) values
  ('or',     'Or',     'ذهب', '#C9A84C', array['18k','21k','24k'], 24500, true),
  ('argent', 'Argent', 'فضة', '#A8B2BD', array['800','925','950'],   210, true)
on conflict (id) do nothing;

insert into public.calibres (value) values
  ('18k'),('21k'),('24k'),('800'),('925'),('950')
on conflict do nothing;

insert into public.shapes (name, sort_order) values
  ('ring',1),('necklace',2),('earring',3),('bracelet',4),('parure4piece',5),
  ('triyeu3piece',6),('gourmette',7),('pendentif',8),('louiza',9),
  ('mahazma',10),('motife',11)
on conflict (name) do nothing;

-- ─── Singleton settings rows ────────────────────────────────────────────────
insert into public.store_settings (id, store_name, slogan)
values (1, 'Bijouterie Bejaia', 'Or & Argent d''exception')
on conflict (id) do nothing;

insert into public.web_contacts (id) values (1) on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
--  AFTER RUNNING ALL SIX FILES
--  ─────────────────────────────
--  1. Open the app. The login screen shows "Créer un compte administrateur"
--     because public.admin_exists() returns false.
--  2. Create it. bootstrap_admin() writes auth.users + profiles + every
--     permission, and the button disappears for good.
--  3. Sign in with that email and password.
--  4. Employés → Nouvel employé creates a real Supabase auth account for each
--     worker and lets you tick exactly which screens and buttons they get.
-- ════════════════════════════════════════════════════════════════════════════

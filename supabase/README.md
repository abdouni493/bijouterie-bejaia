# Base de données — Bijouterie Bejaia

Schéma Supabase complet : authentification, permissions par interface et par
bouton, toutes les tables métier avec leurs relations, et les buckets d'images.

Projet : `https://gnpcmmjhhgcwltkkkvgo.supabase.co`

---

## 1. Installation

Ouvrez le **SQL Editor** du projet :
<https://supabase.com/dashboard/project/gnpcmmjhhgcwltkkkvgo/sql>

Collez et exécutez **`00_complete_setup.sql`** — c'est la concaténation des six
fichiers ci-dessous, dans le bon ordre. Le script est idempotent : le relancer
ne détruit aucune donnée.

| Fichier | Contenu |
|---|---|
| `01_schema.sql` | Extensions, enums, `profiles`, catalogue des permissions, fonctions `is_admin()` / `has_perm()` |
| `02_tables.sql` | Les 40 tables métier et leurs clés étrangères |
| `03_functions.sql` | RPC de création de comptes (`bootstrap_admin`, `create_worker_account`, `set_user_permissions`…) |
| `04_rls.sql` | Row Level Security sur chaque table, adossée aux permissions |
| `05_storage.sql` | Les 4 buckets d'images et leurs règles d'accès |
| `06_seed.sql` | Les 22 interfaces + tous les boutons, et le catalogue de base (Or, Argent, formes, calibres) |

## 2. Premier démarrage

1. Lancez l'application. L'écran de connexion affiche
   **« Créer un compte administrateur »**, parce que `admin_exists()` renvoie `false`.
2. Renseignez nom, email et mot de passe. `bootstrap_admin()` crée le compte
   dans `auth.users`, la ligne `profiles`, et lui accorde **toutes** les permissions.
3. Vous êtes connecté automatiquement. **Le bouton disparaît définitivement** :
   l'interface le masque, et la fonction refuse tout second appel
   (`ADMIN_ALREADY_EXISTS`) même si quelqu'un appelle l'API directement.
4. **Employés → Nouvel employé** : chaque employé reçoit un vrai compte Supabase
   (email + mot de passe) et la liste à cocher des écrans et boutons qui lui sont
   accordés.

## 3. Comment fonctionnent les permissions

Chaque écran et chaque bouton est une ligne de `app_permissions` :

- `<module>.view` — ouvre l'écran (22 interfaces)
- `<module>.create` / `.edit` / `.delete` — les boutons de cet écran
- quelques clés spécifiques : `commands.finalize`, `cassiePurchases.melt`,
  `websiteOrders.cancel`, `workers.permissions.manage`, `debts.pay`…

Les deux extrémités lisent **les mêmes clés** :

| Où | Effet |
|---|---|
| `Sidebar.tsx` | un onglet n'apparaît que si `can('<module>.view')` |
| `App.tsx` | une route refusée affiche « Accès non autorisé » |
| Boutons d'action | masqués si la permission manque |
| **Postgres (RLS)** | l'écriture est **refusée** même via un appel direct à l'API |

L'interface ne fait que refléter la règle ; c'est la base de données qui
l'applique. Un administrateur passe toujours (`is_admin()` court-circuite tout).

## 4. Buckets d'images

| Bucket | Contenu | Qui peut écrire |
|---|---|---|
| `store-logos` | Logo de la bijouterie | `settings.store.edit` |
| `product-images` | Photos des offres du site | `websiteManagement.offer.create` / `.edit` |
| `offer-images` | Photos des offres spéciales | `websiteManagement.special.create` / `.edit` |
| `order-images` | Pièces jointes des commandes personnalisées | tout visiteur (dépôt seul) |

Tous sont **publics en lecture** — la vitrine doit afficher les photos à des
visiteurs non connectés. Les tables ne stockent que l'URL publique.

## 5. Ce que voit un visiteur non connecté

La vitrine (`?view=shop`) lit uniquement :

- `store_settings`, `web_contacts` (nom, logo, réseaux sociaux)
- `web_offers`, `web_special_offers` — **seulement** celles qui ne sont pas masquées
- `web_delivery_companies`, `web_delivery_wilayas` (tarifs de livraison)
- `public_metal_categories`, `public_metal_types` — des vues **sans les quantités
  en stock** : le visiteur peut lire « Or 18k » sans apprendre combien de grammes
  sont en coffre.

Il peut **créer** une commande (`web_orders`), jamais en relire une.

## 6. Réinitialiser

```sql
-- Efface les comptes ET les données. À manier avec précaution.
truncate table public.user_permissions, public.profiles cascade;
delete from auth.users;
```

Au prochain démarrage, l'écran de connexion reproposera la création du compte
administrateur.

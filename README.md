# Altech Bijouterie — Système de Gestion

Application de gestion complète pour bijouterie : **or, argent et tout autre métal**.
Stock, point de vente, ateliers, employés, trésorerie, rapports et boutique en ligne —
en français et en arabe.

L'application est adossée à **Supabase** : authentification, base Postgres et stockage
des images. Chaque employé possède un vrai compte, et l'administrateur choisit
**écran par écran et bouton par bouton** ce que chacun peut voir et faire — la règle
étant appliquée à la fois par l'interface et par la base (Row Level Security).

Le schéma complet se trouve dans [`supabase/`](supabase/) — voir
[`supabase/README.md`](supabase/README.md) pour l'installation.

## Démarrage

**Prérequis :** Node.js 18+

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de production dans dist/
```

### Premier démarrage

1. Exécutez `supabase/00_complete_setup.sql` dans le SQL Editor du projet Supabase.
2. Lancez l'application : l'écran de connexion propose **« Créer un compte
   administrateur »**, car la boutique n'en a pas encore.
3. Créez-le. Vous êtes connecté aussitôt, et **le bouton disparaît définitivement** :
   l'interface le masque et la fonction `bootstrap_admin()` refuse tout second appel.
4. **Employés → Nouvel employé** crée un compte Supabase pour chaque employé et
   la liste à cocher de ses permissions.

La boutique publique est accessible sans compte : `http://localhost:3000/?view=shop`.

### Configuration

Les identifiants du projet Supabase sont intégrés dans `src/lib/supabase.ts`. Pour
viser un autre projet, définissez plutôt :

```bash
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
```

La clé *anon* est publique par conception : chaque table est protégée par RLS, donc
elle n'ouvre rien au-delà de ce que l'utilisateur connecté a le droit de faire.

## Modèle métier : métaux, types de stock, formes

L'application n'est pas liée à un seul métal.

- **Métal** (`MetalCategory`) — la famille de matière : *Or*, *Argent* (fournis d'office),
  plus tout métal créé par l'utilisateur (*Or Blanc*, *Platine*, *Plaqué Or*, …).
  Chaque métal porte sa couleur d'accent, ses calibres et son **prix de référence au gramme**,
  qui sert de coût matière dans tous les calculs de marge.
- **Type de stock** (`MetalType`) — un article concret rattaché à un métal, ex. « Or 18k Italien »
  ou « Argent 925 Local ». Peut être suivi au **poids**, en **cassie** (matière brute) ou
  **à la pièce**.
- **Forme** — la découpe du stock par modèle de bijou (bague, collier, bracelet…).

Tout se gère dans **Catalogue** (métaux, formes, calibres) et **Gestion de Stock**
(types de stock, avec leur métal).

## Structure du projet

```
src/
  main.tsx                 point d'entrée
  App.tsx                  layout, routage par onglet
  context/AppContext.tsx   store applicatif (toutes les données + actions), miroir Supabase
  lib/
    supabase.ts            client Supabase + envoi des images vers les buckets
    auth.ts                connexion, création de comptes, permissions
    permissions.ts         les 22 interfaces et tous les boutons, côté client
    repository.ts          correspondance objets ↔ colonnes, pour chaque table
    useSynced.ts           miroir état React → base de données
  data/
    demoData.ts            jeu de données de démonstration (remplace la base de données)
    algeriaWilayas.ts      wilayas et communes d'Algérie
  types/index.ts           modèle de données
  i18n/translations.ts     traductions FR / AR
  animations/, utils/, styles/
  components/
    auth/        connexion
    layout/      barre latérale, en-tête
    dashboard/   tableau de bord, rapports
    catalog/     stock, catalogue (métaux / formes / calibres)
    purchasing/  fournisseurs, achats, achats cassie
    sales/       POS, factures, remplacements, clients
    workshop/    ateliers, réparations & industrie, livraisons
    staff/       employés, paie
    finance/     trésorerie, dépenses, dettes, historique de paiements
    webshop/     administration du site et commandes en ligne
    storefront/  boutique publique
    settings/    paramètres
```

## Permissions

Chaque écran et chaque bouton porte une clé (`pos.view`, `purchases.delete`,
`commands.finalize`, …). Les mêmes clés sont lues à trois endroits :

- la barre latérale n'affiche un onglet que si `can('<module>.view')` ;
- les boutons d'action sont masqués sans leur permission ;
- **Postgres refuse l'écriture** même si l'API est appelée directement.

L'interface ne fait que refléter la règle ; c'est la base qui l'applique. Un
administrateur détient toujours l'ensemble des permissions.

## Images

Les photos ne sont plus encodées en base64 dans les enregistrements : elles sont
envoyées dans des buckets Supabase (`store-logos`, `product-images`, `offer-images`,
`order-images`) et les tables ne conservent que l'URL publique.

## Données

- **Sauvegarde** — *Paramètres → Données* exporte un instantané JSON de l'état courant.
- **Restauration** — le même écran réimporte un fichier exporté.

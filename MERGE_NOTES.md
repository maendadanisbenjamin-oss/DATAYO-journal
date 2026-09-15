# Notes de fusion — implement-profile-avatar-feature (V1 + V2)

## Base retenue : V1

V1 a été choisie comme base car plus complète et plus mûre : modèle de
données plus riche (invitations, licences fournisseurs, détection de trous
de données, stratégies dédiées), documentation d'exploitation sérieuse
(`docs/MARKET_DATA_OPERATIONS.md`), et une vraie suite de tests
(vitest + playwright), là où V2 n'avait ni tests automatisés, ni doc, ni ces
fonctionnalités.

## Fonctionnalité "avatar de profil"

Strictement identique entre V1 et V2 (composant, route `/api/profile`,
colonne `avatar_url`, traductions). Aucune fusion nécessaire, reprise telle
quelle depuis V1.

## Ajouts portés depuis V2

### `/api/compare` (nouveau)
Agrège les statistiques Live / Replay / Backtest de l'utilisateur. Adapté
au schéma V1 (table `replayTrades` au lieu de `replayActions`).

**Branché sur l'UI existante** : le tableau "Comparaison Live / Replay /
Backtest" dans `BacktestingTab` (`market-tabs.tsx`) affichait déjà ce
concept en V1, mais la ligne Replay était figée ("Sélectionner une session
Replay"). Elle affiche maintenant les vraies statistiques agrégées de
toutes les sessions Replay de l'utilisateur.

### `/api/market/status` (nouveau)
Vue d'exploitation sur un instrument : couverture des données, trous
ouverts, imports récents. Adapté au schéma V1 : contrairement à V2 (qui
stocke chaque timeframe), V1 ne stocke que du M1 (`candles_m1`) et dérive
les timeframes supérieurs à la volée — la couverture rapportée porte donc
uniquement sur le M1, pour rester exacte. Réutilise `RETENTION_YEARS` /
`retentionCutoff`, déjà présents dans `lib/market-engine.ts` (pas besoin de
les dupliquer comme le fait V2).

Cette route n'est pour l'instant pas branchée à un écran (comme en V2
d'ailleurs, où elle alimentait un panneau du `backtest-tab.tsx` propre à
cette version). Elle est prête à être appelée si vous voulez ajouter cet
affichage.

## Volontairement laissé de côté

- **Flux "live" synthétique de V2** (`/api/market/live`, `lib/market/live.ts`) :
  ce mécanisme génère des bougies fictives par marche aléatoire pour
  simuler un marché en temps réel — il n'était d'ailleurs branché à aucun
  écran, même dans V2. Il contredit l'approche de V1, entièrement construite
  autour de données réelles et de leur conformité (licences, rétention,
  anti-fuite-du-futur). Non intégré pour ne pas introduire une source de
  données fictive dans une base autrement rigoureuse. Dites-le-moi si vous
  voulez malgré tout un mode démo de ce type.
- **Réorganisation modulaire de V2** (dossiers `market/`, `econ/` en
  plusieurs fichiers) : purement cosmétique, sans gain fonctionnel, et
  risque de régression élevé sur une base de code de cette taille pour un
  bénéfice qui reste discutable. Les fichiers V1 (`market-data-service.ts`,
  `market-engine.ts`, `economic-calendar-service.ts`...) sont conservés
  tels quels.

## Vérifications effectuées

- `npm install` : OK (427 paquets)
- `npx tsc --noEmit` : **0 erreur** sur l'ensemble du projet fusionné
- `npx eslint` sur les fichiers créés/modifiés : les seules erreurs
  remontées (règles `react-hooks/purity` et `react-hooks/set-state-in-effect`,
  8 au total) préexistaient déjà à l'identique dans le `market-tabs.tsx`
  original de V1 — vérifié par comparaison directe. Rien n'a été introduit
  par la fusion.

## Non vérifié

`next build` / exécution réelle : nécessite une base PostgreSQL, non
disponible dans cet environnement d'analyse. À tester en local avec votre
base de données avant mise en production.

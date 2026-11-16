## Revue de compatibilité — Zod 4.5.4 → 4.6.7 / body-parser 2.3.0 → 2.4.0

Analyse des changements de comportement signalés dans les notes de version, afin d'identifier les risques de régression liés à la mise à jour des dépendances.

### 1. Zod — Changements de comportement

**Zod 4.6.0 — Messages d'erreur et validation**

- **`safeParse()` et messages d'erreur** : les erreurs sont désormais construites lors du premier accès à `result.error`, et non immédiatement pendant le parsing. Les fonctions de personnalisation des erreurs (globales, locales ou propres au schéma) sont donc exécutées plus tard. Une modification de `z.config()` entre le parsing et la lecture de l'erreur peut changer le message obtenu. Les appels `.parse()` restent immédiats. [Source](https://github.com/colinhacks/zod/pull/6519).
- **`z.emoji()`** : les chaînes ne contenant que des composants Unicode d'emoji, comme `"123"`, `"#"` ou `"*"`, sont désormais rejetées. [Source](https://github.com/colinhacks/zod/pull/6532).
- **`z.enum()` avec des enums TypeScript numériques** : `.options` ne contient plus les correspondances inverses (noms des constantes). Les valeurs valides pour le parsing restent inchangées. [Source](https://github.com/colinhacks/zod/pull/6542).
- **`z.base64()` / `z.base64url()`** : modification des expressions régulières utilisées à l'exécution. Dans un schéma composé, notamment `z.templateLiteral()`, la vérification peut désormais porter sur l'alphabet sans vérifier la longueur ou le padding. L'expression exportée `z.regexes.base64url` change également. Les formes JSON Schema indiquées dans les notes restent inchangées. [Source](https://github.com/colinhacks/zod/pull/6534).
- **`z.email()`** : suppression des lookaheads dans l'expression régulière. La validation d'une adresse seule conserve les mêmes règles, mais le contenu de `z.regexes.email`, de `issue.pattern` et du `pattern` généré par `z.toJSONSchema()` change. Dans `z.templateLiteral()`, certaines chaînes auparavant rejetées peuvent être acceptées. [Source](https://github.com/colinhacks/zod/pull/6573).

**Zod 4.6.0 — JSON Schema et métadonnées**

- **`z.toJSONSchema()`** : les contraintes chaînées sont désormais combinées correctement, indépendamment de leur ordre. Les bornes `.min()`, `.max()`, `.length()`, `.int()` et les contraintes répétées `.multipleOf()` peuvent produire un JSON Schema différent de la version 4.5. La validation à l'exécution appliquait déjà les contraintes correspondantes. [Source](https://github.com/colinhacks/zod/pull/6554).
- **`z.fromJSONSchema()`** : six mots-clés auparavant ignorés sont maintenant appliqués : `minProperties`, `maxProperties`, `uniqueItems`, `contains`, `minContains` et `maxContains`. Certains jeux de données précédemment acceptés peuvent donc être rejetés. [Source](https://github.com/colinhacks/zod/pull/6535).
- **Métadonnées des schémas** : `.format`, `.minLength`, `.maxLength`, `.minValue`, `.maxValue`, `.isInt`, `.minDate` et `.maxDate` sont calculées au premier accès. Leur présence dans `Object.keys()` ou `Object.assign()` peut changer, ainsi que certaines valeurs lorsque des contraintes sont chaînées. [Source](https://github.com/colinhacks/zod/releases/tag/v4.6.0).

**Zod 4.6.1 à 4.6.6 — Corrections supplémentaires**

- **4.6.1** : correction des unions discriminées utilisant des discriminateurs avec valeur par défaut, pour préserver les étiquettes distinctes. [Source](https://github.com/colinhacks/zod/pull/6582).
- **4.6.2** : correction de `.prefault()` afin de préserver les sorties `undefined` et certaines clés d'objet précédemment omises, notamment lorsque la sortie d'un champ possède une valeur par défaut. [Source](https://github.com/colinhacks/zod/pull/6587).
- **4.6.3** : `z.properties()` ne fonctionne plus comme schéma autonome ; il redevient un contrôle utilisable dans `.check(...)`. La méthode `z.instanceof(...).properties(...)` reste disponible. [Source](https://github.com/colinhacks/zod/releases/tag/v4.6.3).
- **4.6.6** : les contraintes de taille maximale sur les tableaux, ensembles et maps (`.max()`, `.length()`, `.size()`) peuvent désormais rejeter une entrée trop grande avant le parsing de ses éléments. Cela change le nombre et l'ordre des erreurs produites et peut empêcher l'exécution de transformations, raffinements ou coercitions sur les éléments concernés. [Source](https://github.com/colinhacks/zod/pull/6652).

**Coercition (`z.coerce.*`)**

Aucune modification générale de la sémantique des fonctions `z.coerce.*` n'est explicitement annoncée dans les notes consultées. Le principal point de vigilance concerne l'ordre de validation introduit en 4.6.6 : les éléments d'un conteneur trop grand peuvent ne plus être évalués, et donc ne plus être convertis.

**Périmètre** : la version 4.5.4 corrige aussi l'exécution indésirable d'une fabrique de valeur par défaut durant la détection des cycles. Cette correction est déjà présente dans la version de départ. La version 4.6.7 ne décrit pas de changement fonctionnel supplémentaire.

### 2. body-parser — Changements de comportement

**Version 2.4.0**

- **Support de `Content-Encoding: zstd`** : les corps compressés en Zstandard peuvent maintenant être acceptés avec Node.js `^22.15.0` ou `>=23.8.0`. Sur les versions antérieures de Node.js, ils continuent à renvoyer HTTP `415`. [Historique](https://github.com/expressjs/body-parser/blob/master/HISTORY.md).
- **Mutation des options du parseur** : les paramètres partagés du middleware ne sont plus modifiés avec des valeurs propres à chaque requête lors de la lecture du corps. [Source](https://github.com/expressjs/body-parser/pull/742).
- **Mutation de la requête** : suppression des mutations temporaires de propriétés telles que `req.length` durant la gestion du flux. [Source](https://github.com/expressjs/body-parser/pull/750).
- **Correction de sécurité** : correction de [GHSA-27r3-jxmh-p828 / CVE-2026-111181](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828), concernant un risque de déni de service lié aux octets supplémentaires après un corps compressé. Les erreurs sur ces flux doivent désormais être gérées sans provoquer l'arrêt du processus.

**Rappel concernant la version 2.3.0**

- Les valeurs invalides de l'option `limit` (chaînes non interprétables, `NaN`) provoquent une exception au lieu d'être ignorées.
- `null` et `undefined` utilisent la limite par défaut de `100kb`.

Ces deux règles sont déjà présentes en 2.3.0 : elles ne constituent donc pas des changements nouveaux entre 2.3.0 et 2.4.0.

### 3. Vérifications recommandées avant fusion

- [ ] Vérifier les tests et snapshots des messages d'erreur Zod, notamment les configurations de langue.
- [ ] Comparer les sorties de `z.toJSONSchema()` pour les schémas utilisant des contraintes chaînées, ainsi que les patterns des emails.
- [ ] Tester les conversions `z.coerce.*`, en particulier dans les tableaux avec taille maximale.
- [ ] Contrôler les objets contenant des propriétés par défaut, des `.prefault()` ou des unions discriminées.
- [ ] Vérifier le traitement des requêtes compressées, le support éventuel de `zstd` et la version de Node.js utilisée.
- [ ] Contrôler les réponses HTTP et la remontée des erreurs lorsque le corps d'une requête est invalide ou malformé.
- [ ] Confirmer qu'aucun code applicatif ne dépend de mutations internes des objets de requête ou des options du parseur.

### Conclusion

**Compatibilité à valider par les tests de régression.**

Les évolutions sont principalement des corrections, mais plusieurs comportements observables changent : moment de génération des erreurs, contenu des JSON Schema, ordre de validation, structure des résultats et traitement de certains corps HTTP.

La mise à jour ne doit donc pas être considérée comme strictement transparente sans vérification des usages effectifs dans l'application.

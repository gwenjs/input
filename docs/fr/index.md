---
layout: home

hero:
  name: "@gwenjs/input"
  text: "Input pour GWEN"
  tagline: Clavier, souris, manette, touch et gyroscope — système d'actions unifié, contextes empilables, rebinding à l'exécution.
  actions:
    - theme: brand
      text: Démarrage rapide
      link: /fr/guide/getting-started
    - theme: alt
      text: Référence API
      link: /fr/api/

features:
  - title: Actions typées
    details: Déclarez des actions typées avec defineAction et ActionRef — button, axis1d et axis2d. L'inférence TypeScript se propage de defineAction jusqu'à useAction.
  - title: Contextes d'entrée empilables
    details: Déclarez des contextes nommés avec des priorités. Activez-les et désactivez-les à l'exécution par joueur — gameplay, menus, véhicules, cinématiques coexistent proprement.
  - title: Rebinding & profils d'accessibilité
    details: Les joueurs peuvent remapper n'importe quel binding à l'exécution. Livrez des préréglages d'accessibilité nommés activables en un seul appel.
  - title: Multijoueur local
    details: Jusqu'à 4 joueurs locaux, chacun avec sa propre pile de contextes et ses overrides de bindings. Accédez à chacun via usePlayer(index) ou engine.inject('player:0').
  - title: Enregistrement & lecture
    details: Enregistrez des sessions d'entrée et rejouez-les à n'importe quelle vitesse. Idéal pour les replays déterministes, les tests automatisés et la reproduction de bugs.
  - title: Suite complète de composables
    details: useInput, useAction, usePlayer, useKeyboard, useMouse, useGamepad, useTouch, useGyroscope, usePointer, useInputRecorder, useInputPlayback, forPlayers.
---

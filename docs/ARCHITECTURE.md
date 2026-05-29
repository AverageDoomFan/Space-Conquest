# Space Conquest Architecture

## Folders
- `index.html`: menu screen, game screen, HUD, game over overlay.
- `styles/main.css`: all UI and canvas styles.
- `src/main.js`: bootstraps UI, wires buttons, stores previous score.
- `src/game/Game.js`: game loop, wave generation, enemy AI, combat, collisions, rendering.
- `src/game/constants.js`: gameplay constants and sprite paths.
- `src/game/utils.js`: math and helper utilities.
- `src/game/systems/Input.js`: keyboard input handling.
- `src/game/entities/*`: entity models (`Player`, `Enemy`, `Projectile`, `Rock`, `Cube`).

## Sprite naming and location
Place sprite files in `Ressources/Sprites` with these names:
- `ship.png`
- `basic-monster.png`
- `tank-monster.png`
- `projectile-monster.png`
- `boss-monster.png`
- `rock.png`

These names are mapped in `src/game/constants.js` (`SPRITES`).

## Runtime-generated visuals
- Projectiles are rendered as circles in real time.
- Upgrade cubes are rendered as rotating colored squares in real time.

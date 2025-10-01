# API REST de Ludo - Documentación

## Descripción

Esta API REST reemplaza completamente a boardgame.io, proporcionando un sistema robusto para jugar Ludo con un watchdog integrado que monitorea todos los cambios en las partidas.

## Características Principales

- ✅ **API REST completa** - Todas las acciones del juego disponibles via HTTP
- ✅ **Sistema de Watchdog** - Monitoreo automático de cambios en las partidas
- ✅ **Gestión de estado independiente** - Sin dependencias externas complejas
- ✅ **Historial de eventos** - Seguimiento completo de todas las acciones
- ✅ **Suscripciones en tiempo real** - Sistema preparado para WebSockets/SSE

## Endpoints Disponibles

### 🎮 Gestión de Juegos

#### Crear un nuevo juego
```http
POST /ludo/create-game
```
**Respuesta:**
```json
{
  "gameId": "uuid-del-juego",
  "message": "Juego creado exitosamente"
}
```

#### Obtener información de un juego
```http
GET /ludo/game/{gameId}
```
**Respuesta:**
```json
{
  "gameId": "uuid-del-juego",
  "players": [...],
  "currentPlayer": 0,
  "diceValue": 0,
  "gamePhase": "waiting",
  "winner": null,
  "gameStarted": false,
  "availableColors": ["red", "blue", "yellow", "green"],
  "canRollDice": false,
  "canMovePiece": false,
  "selectedPieceId": null,
  "lastUpdated": "2024-01-01T00:00:00.000Z",
  "version": 1
}
```

#### Listar juegos disponibles
```http
GET /ludo/games
```

#### Listar todos los juegos
```http
GET /ludo/games/all
```

#### Eliminar un juego
```http
DELETE /ludo/game/{gameId}
```

### 👥 Gestión de Jugadores

#### Unirse a un juego
```http
POST /ludo/game/{gameId}/join
Content-Type: application/json

{
  "name": "Nombre del Jugador",
  "color": "red"
}
```
**Respuesta:**
```json
{
  "success": true,
  "message": "Te uniste exitosamente al juego",
  "gameId": "uuid-del-juego",
  "playerId": "uuid-del-jugador-generado-por-backend"
}
```

#### Rejoin a un juego existente
```http
GET /ludo/game/{gameId}/rejoin/{playerId}
```
**Respuesta:**
```json
{
  "success": true,
  "message": "Rejoin exitoso",
  "playerData": {
    "name": "Nombre del Jugador",
    "color": "red"
  }
}
```

### 🎲 Acciones del Juego

#### Iniciar el juego
```http
POST /ludo/game/{gameId}/start
```

#### Lanzar dado
```http
POST /ludo/game/{gameId}/player/{playerId}/roll-dice
```

#### Seleccionar y mover pieza
```http
POST /ludo/game/{gameId}/player/{playerId}/select-piece
Content-Type: application/json

{
  "pieceId": 0
}
```

**Nota**: Este endpoint maneja tanto la selección como el movimiento de la pieza automáticamente. El jugador solo necesita indicar qué pieza quiere mover (por ID), y el sistema determina si es válido moverla o sacarla del start.

### 📊 Watchdog y Monitoreo

#### Suscribirse a cambios (para polling)
```http
POST /ludo/game/{gameId}/subscribe/{playerId}
```

#### Cancelar suscripción
```http
DELETE /ludo/subscription/{subscriptionId}
```

#### Obtener historial de eventos
```http
GET /ludo/game/{gameId}/events?limit=50
```

#### Estadísticas del watchdog
```http
GET /ludo/watchdog/stats
```

#### Limpiar datos antiguos
```http
POST /ludo/watchdog/cleanup
```

### 🔧 Endpoints de Utilidad

#### Colores disponibles
```http
GET /ludo/available-colors/{gameId}
```

#### Jugadores del juego
```http
GET /ludo/game/{gameId}/players
```

#### Estado del juego
```http
GET /ludo/game/{gameId}/status?playerId={playerId}
```

**Sin playerId (información básica):**
```json
{
  "gamePhase": "playing",
  "gameStarted": true,
  "currentPlayer": 0,
  "diceValue": 4,
  "winner": null
}
```

**Con playerId (información completa del jugador):**
```json
{
  "gamePhase": "playing",
  "gameStarted": true,
  "currentPlayer": 0,
  "diceValue": 4,
  "winner": null,
  "isPlayerTurn": true,
  "canRollDice": true,
  "canMovePiece": false,
  "selectedPieceId": null,
  "playerColor": "red",
  "playerName": "Jugador 1",
  "players": [
    {
      "id": "player-uuid",
      "name": "Jugador 1",
      "color": "red",
      "action": "roll_dice",
      "actionTimeLeft": 75,
      "diceValue": 4,
      "pieces": [...]
    }
  ]
}
```

**Campos del temporizador de acción:**
- `action`: Acción que debe realizar el jugador (`"roll_dice"`, `"rolling"`, `"select_piece"`, `"move_piece"`)
- `actionTimeLeft`: Porcentaje de tiempo restante (0-100) para completar la acción actual
- `diceValue`: Valor del dado obtenido (solo visible para el jugador activo)

## Flujo de Juego Típico

### 1. Crear y unirse a un juego
```bash
# Crear juego
curl -X POST http://localhost:3000/ludo/create-game

# Unirse al juego (repetir para cada jugador)
# El backend genera automáticamente el playerId
curl -X POST http://localhost:3000/ludo/game/{gameId}/join \
  -H "Content-Type: application/json" \
  -d '{"name": "Jugador 1", "color": "red"}'

# Guardar el playerId devuelto para futuros rejoin
# Respuesta: {"success": true, "playerId": "uuid-generado", ...}
```

### 1.1. Rejoin a un juego existente
```bash
# Si ya tienes un playerId, puedes hacer rejoin
curl -X GET http://localhost:3000/ludo/game/{gameId}/rejoin/{playerId}
```

### 2. Iniciar el juego
```bash
curl -X POST http://localhost:3000/ludo/game/{gameId}/start
```

### 3. Jugar (turno del jugador actual)
```bash
# Lanzar dado
curl -X POST http://localhost:3000/ludo/game/{gameId}/player/{playerId}/roll-dice

# Seleccionar pieza (esto mueve automáticamente)
# El sistema determina si es válido sacar del start o mover en el tablero
curl -X POST http://localhost:3000/ludo/game/{gameId}/player/{playerId}/select-piece \
  -H "Content-Type: application/json" \
  -d '{"pieceId": 0}'
```

### 4. Monitorear cambios (Polling)
```bash
# Verificar estado básico del juego (sin información sensible)
curl http://localhost:3000/ludo/game/{gameId}

# Verificar estado del jugador específico (con información de turno)
curl "http://localhost:3000/ludo/game/{gameId}/status?playerId={playerId}"

# Ver historial de eventos
curl http://localhost:3000/ludo/game/{gameId}/events
```

## Sistema de Watchdog

El watchdog monitorea automáticamente todos los cambios en las partidas y:

- ✅ **Detecta cambios** cada 500ms
- ✅ **Registra eventos** de todas las acciones
- ✅ **Notifica suscriptores** cuando hay cambios
- ✅ **Mantiene historial** de eventos por juego
- ✅ **Limpia datos antiguos** automáticamente

### Tipos de Eventos Registrados

- `game_created` - Juego creado
- `player_joined` - Jugador se unió
- `player_ready` - Jugador marcado como listo
- `game_started` - Juego iniciado
- `dice_rolled` - Dado lanzado
- `piece_selected` - Pieza seleccionada
- `piece_moved` - Pieza movida
- `game_finished` - Juego terminado

## Ventajas sobre boardgame.io

1. **Simplicidad** - API REST estándar, fácil de integrar
2. **Control total** - Lógica de juego completamente personalizable
3. **Debugging** - Fácil debuggear con logs y historial
4. **Escalabilidad** - Sistema preparado para múltiples instancias
5. **Flexibilidad** - Fácil agregar nuevas funcionalidades
6. **Monitoreo** - Watchdog integrado para observabilidad

## Próximos Pasos

Para una implementación completa en producción, considera:

1. **WebSockets/SSE** - Reemplazar polling con conexiones en tiempo real
2. **Base de datos** - Persistir estado de juegos
3. **Autenticación** - Sistema de usuarios y sesiones
4. **Rate limiting** - Proteger contra abuso
5. **Logging** - Sistema de logs estructurado
6. **Métricas** - Monitoreo de performance

## Ejecutar el Servidor

```bash
# Instalar dependencias
pnpm install

# Ejecutar en desarrollo
pnpm run start:dev

# Compilar para producción
pnpm run build
pnpm run start:prod
```

El servidor estará disponible en `http://localhost:3000`

# 🎲 Juego de Ludo - Backend

Este es el backend para un juego de Ludo multijugador implementado con NestJS y boardgame.io.

## 🚀 Características

- ✅ Creación de salas de juego
- ✅ Hasta 4 jugadores por sala
- ✅ Selección de colores (rojo, azul, amarillo, verde)
- ✅ Sistema de nicknames
- ✅ Validación para iniciar juego (mínimo 2 jugadores)
- ✅ Lógica completa del juego Ludo
- ✅ API REST para gestión de salas
- ✅ WebSocket para comunicación en tiempo real

## 🛠️ Instalación

```bash
# Instalar dependencias
pnpm install

# Ejecutar en modo desarrollo
pnpm run start:dev

# Ejecutar en modo producción
pnpm run build
pnpm run start:prod
```

## 📡 API Endpoints

### Crear Sala
```http
POST /ludo/create-room
```
**Respuesta:**
```json
{
  "roomId": "abc123def456",
  "message": "Sala creada exitosamente"
}
```

### Obtener Información de Sala
```http
GET /ludo/room/{roomId}
```
**Respuesta:**
```json
{
  "roomId": "abc123def456",
  "players": [
    {
      "id": "player1",
      "name": "Juan",
      "color": "red",
      "isReady": false
    }
  ],
  "gameState": null,
  "isFull": false,
  "gameStarted": false,
  "availableColors": ["blue", "yellow", "green"]
}
```

### Unirse a Sala
```http
POST /ludo/room/{roomId}/join
Content-Type: application/json

{
  "name": "María",
  "color": "blue",
  "playerId": "player2"
}
```
**Respuesta:**
```json
{
  "success": true,
  "message": "Te uniste exitosamente a la sala",
  "roomId": "abc123def456"
}
```

### Obtener Salas Disponibles
```http
GET /ludo/rooms
```

### Obtener Colores Disponibles
```http
GET /ludo/available-colors
```

## 🎮 WebSocket (boardgame.io)

El servidor de boardgame.io está disponible en `/api` y proporciona:

- **Conexión WebSocket:** `ws://localhost:3000/api`
- **API de juego:** `http://localhost:3000/api`

### Ejemplo de Conexión WebSocket

```javascript
import { Client } from 'boardgame.io/client';

const client = Client({
  game: LudoGame,
  multiplayer: { server: 'http://localhost:3000/api' }
});

// Conectar a una sala específica
client.start();
client.multiplayer.join('abc123def456', 'player1');
```

## 🎯 Reglas del Juego

1. **Objetivo:** Llevar todas las fichas de tu color a la meta
2. **Turnos:** Los jugadores lanzan un dado por turno
3. **Salir de casa:** Necesitas un 6 para sacar una ficha de casa
4. **Movimiento:** Las fichas se mueven según el valor del dado
5. **Captura:** Si aterrizas en una casilla ocupada, capturas la ficha
6. **Meta:** Las fichas deben llegar exactamente a la meta
7. **Ganador:** El primer jugador en meter todas sus fichas gana

## 🏗️ Estructura del Proyecto

```
src/
├── ludo/
│   ├── ludo.game.ts      # Lógica del juego
│   ├── ludo.module.ts    # Módulo de NestJS
│   ├── ludo.service.ts   # Servicio de gestión de salas
│   └── ludo.controller.ts # Controlador REST
├── app.module.ts         # Módulo principal
└── main.ts              # Configuración del servidor
```

## 🔧 Configuración

El servidor se ejecuta en el puerto 3000 por defecto. Puedes cambiarlo con la variable de entorno:

```bash
PORT=8080 pnpm run start:dev
```

## 🧪 Pruebas

```bash
# Ejecutar tests unitarios
pnpm run test

# Ejecutar tests e2e
pnpm run test:e2e
```

## 📝 Notas de Desarrollo

- El juego usa boardgame.io para la lógica del juego y comunicación en tiempo real
- Las salas se gestionan localmente en memoria (para producción considera usar Redis)
- CORS está habilitado para desarrollo
- El servidor soporta hasta 4 jugadores por sala

## 🚀 Próximos Pasos

- [ ] Implementar persistencia de salas con base de datos
- [ ] Agregar sistema de autenticación
- [ ] Implementar chat en tiempo real
- [ ] Agregar estadísticas de jugadores
- [ ] Crear interfaz web para el juego

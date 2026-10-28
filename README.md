# Elemental Survivor V2.4 · La Oscuridad Infinita

Juego de supervivencia pixel art para PC, Android y iPhone como PWA. **No necesita servidor de aplicaciones ni base de datos:** el progreso local se conserva en el navegador.

## Cambios principales de V2.4

- Balance: salud inicial 90, velocidad reducida, mejoras de daño y cadencia moderadas y limitadas. XP más progresivo. Enemigos aumentan gradualmente su resistencia y daño.
- Diez tipos nuevos (seis enemigos y cuatro guardianes de minijefes), con sprites originales. Dos encuentros de minijefes por reino; en supervivencia aparecen minijefes adicionales.
- Mundo libre por bioma, sin murallas ni límites. Tras derrotar a cada uno de los tres primeros jefes aparece un portal luminoso **cerca del personaje** para entrar al siguiente reino.
- Cofres escasos: aparición aleatoria cada ~105-150 segundos (la primera vez a los 75-105), muy poca probabilidad de botín de enemigos normales y solo 18% de probabilidad de cofre por minijefe. Cada jefe principal deja uno. Los cofres pueden desaparecer después de 145 segundos; hay un máximo de dos en el mundo a la vez.
- Ruleta arcana de recompensas animada durante unos 3 segundos. La rareza del cofre se resuelve antes del giro; la animación revela la recompensa ya seleccionada (sin alterar el azar durante el giro). Cuatro rarezas: común 55%, poco común 25%, raro 15% y mítico 5%.
- Al derrotar al cuarto guardián, transcurren ~95 segundos antes de que aparezca el quinto jefe: **Oscuridad, Señor del Vacío**, con sprite nuevo, más grande.
- Al derrotar a Oscuridad **no termina la partida**. Aparece la oleada 1 y las siguientes se vuelven más duras. La partida termina solo cuando el personaje se queda sin vida. Se guarda la mejor oleada localmente.
- Estética refinada: pixel art original, colores violeta noche, esmeralda y dorado, más contraste en menús y ruleta.

## Se conserva

- Cuatro biomas, cinco elementos, cuatro skins, amuletos malditos, reliquias, monedas y mejoras permanentes.
- Los datos se leen y escriben con la misma clave `arcade_ar_pixel_survivor_v2`, para mantener el progreso existente.

## Instalar / publicar en Vercel

Descomprimir el ZIP, abrir la carpeta del proyecto en VS Code y, opcionalmente, ejecutar `py -m http.server 5500` para probarlo en `http://localhost:5500`.

Para publicar **en el proyecto correcto de Pixel/Elemental Survivor, no en otros juegos ni Barber Manager**:

```powershell
npx vercel link
npx vercel --prod
```

Confirmar equipo y nombre del proyecto durante el vínculo.

## Demo sin servidor

El archivo `Elemental_Survivor_V2_4_Demo_Jugable.html` se genera ejecutando `python build_offline.py` y funciona en un navegador moderno sin necesidad de hosting. También se entrega por separado.

## Arte

El atlas de sprites se encuentra en `assets/pixel-atlas.png`, el listado de regiones en `assets/sprites.json` y los PNG ampliados de los nuevos personajes en `assets/new-*.png`. `generate_v24_art.py` reproduce los nuevos diseños (requiere Pillow). Evitá ejecutar solo `generate_art.py` porque esa utilidad anterior vuelve a producir el atlas de V2.3; en ese caso ejecutá después `generate_v24_art.py`.

## Pruebas

El botón de pausa tiene opciones para testear cofres, jefes, minijefes y transiciones. Para una partida real, no usar los botones de prueba. Probada la ejecución del juego y flujos principales en Chromium mediante pruebas de humo; el balance final está sujeto a partidas completas con jugadores.

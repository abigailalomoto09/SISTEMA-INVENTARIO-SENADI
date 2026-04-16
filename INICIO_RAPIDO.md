# INSTRUCCIONES RÁPIDAS PARA EJECUTAR EL PROYECTO

## PASO 1: EJECUTAR SCRIPT SQL EN MYSQL WORKBENCH

1. Abre MySQL Workbench
2. Conecta con: usuario=root, contraseña=1234
3. Abre el archivo:
   ```
   C:\Users\mayer\Documents\NetBeansProjects\SistemaInventarioV3\inventario_dtic_2026_modelo_workbench_compatible (1).sql
   ```
4. Ejecuta el script (Ctrl+Shift+Enter o botón de ejecutar)
5. Espera a que termine sin errores

## PASO 2: COMPILAR EN NETBEANS

1. Abre el proyecto en NetBeans
2. Haz clic derecho en el proyecto "SistemaInventarioV3"
3. Selecciona "Clean and Build" (o presiona Shift+F11)
4. Espera a que compile exitosamente

## PASO 3: EJECUTAR EL SERVIDOR

1. Haz clic derecho en el proyecto
2. Selecciona "Run"
3. Espera a que se despliegue en WildFly (o el servidor configurado)

## PASO 4: ACCEDER A LA APLICACIÓN

1. Abre en tu navegador: 
   ```
   http://localhost:8080/SistemaInventarioV3/
   ```
2. Login con:
   - Usuario: admin
   - Contraseña: admin123

3. Haz clic en "Inventario" en el menú
4. Deberías ver la tabla con los datos de PCs y Laptops

## VERIFICAR QUE TODO ESTÉ BIEN

### Si la tabla está vacía:

1. Abre la consola del navegador (F12)
2. Verifica si hay errores en rojo
3. Abre la pestaña "Network" y busca la llamada a:
   ```
   /SistemaInventarioV3/resources/inventario/pcs
   ```
4. Si el estado es 200, haz clic en la respuesta para ver si tiene datos

### Si ves error 404:
- Reinicia el servidor
- Verifica que WildFly esté corriendo
- Comprueba que la aplicación se desplegó correctamente

### Si ves error 500:
- Revisa la consola del servidor para errores
- Verifica que MySQL esté corriendo
- Comprueba la conexión en persistence.xml

## CAMBIOS REALIZADOS

✅ Interfaz mejorada con diseño profesional
✅ Sidebar azul marino con menú limpio
✅ Tabla de inventario optimizada
✅ FetchType.EAGER para cargar relaciones
✅ JavaScript mejorado para manejar datos
✅ Mejor manejo de nulos en custodios y ubicaciones

## PRÓXIMOS PASOS SI NECESITAS AYUDA

1. Verifica que MySQL Workbench está ejecutando el script sin errores
2. Para verificar datos en MySQL:
   ```sql
   SELECT COUNT(*) FROM inventario_dtic_2026.pcs;
   SELECT COUNT(*) FROM inventario_dtic_2026.laptops;
   ```
3. Si ves 0, el script no se ejecutó correctamente

## NOTAS IMPORTANTES

- La interfaz ahora usa FetchType.EAGER, así que cargará las relaciones automáticamente
- Si algunos registros tienen custodios o ubicaciones NULL, se mostrarán como "-"
- El estado se muestra con colores (Verde=Activo, Naranja=Otro, Rojo=Baja)

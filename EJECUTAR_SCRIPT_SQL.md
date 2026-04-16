# Pasos para cargar datos en la base de datos y probar la interfaz

## 1. ABRIR MySQL Workbench

1. Abre MySQL Workbench
2. Conecta con tu instancia MySQL (usuario: root, contraseña: 1234)

## 2. EJECUTAR EL SCRIPT SQL PRINCIPAL

1. Ve a: File > Open SQL Script
2. Selecciona el archivo: 
   ```
   inventario_dtic_2026_modelo_workbench_compatible (1).sql
   ```
3. **IMPORTANTE**: Este script:
   - Elimina la base de datos anterior (DROP DATABASE)
   - Crea nueva base de datos con estructura completa
   - Inserta todos los datos de prueba (Custodios, Ubicaciones, PCs, Laptops, etc.)

4. Ejecuta el script (Ctrl+Shift+Enter o el botón de ejecutar)
5. Espera a que se complete sin errores

## 3. VERIFICAR QUE LOS DATOS FUERON CARGADOS

Ejecuta estas queries para verificar:

```sql
-- Verificar custodios
SELECT COUNT(*) as "Total Custodios" FROM inventario_dtic_2026.custodios;

-- Verificar ubicaciones
SELECT COUNT(*) as "Total Ubicaciones" FROM inventario_dtic_2026.ubicaciones;

-- Verificar PCs
SELECT COUNT(*) as "Total PCs" FROM inventario_dtic_2026.pcs;

-- Ver algunas PCs
SELECT codigo_sbai, codigo_megan, descripcion, marca, modelo, estado 
FROM inventario_dtic_2026.pcs 
LIMIT 5;

-- Verificar Laptops
SELECT COUNT(*) as "Total Laptops" FROM inventario_dtic_2026.laptops;

-- Ver algunas Laptops
SELECT codigo_sbai, codigo_megan, descripcion, marca, modelo, estado 
FROM inventario_dtic_2026.laptops 
LIMIT 5;
```

## 4. CARGAR USUARIOS DE PRUEBA (OPCIONAL)

Si quieres actualizar los usuarios, ejecuta:

```sql
-- Crear usuarios de prueba
INSERT INTO inventario_dtic_2026.usuarios (username, password, nombre_completo, rol, estado, fecha_creacion) 
VALUES ('admin', '0192023a7bbd73250516f069df18b500', 'Administrador', 'ADMINISTRADOR', 'ACTIVO', NOW())
ON DUPLICATE KEY UPDATE 
  password = '0192023a7bbd73250516f069df18b500',
  nombre_completo = 'Administrador',
  rol = 'ADMINISTRADOR';

INSERT INTO inventario_dtic_2026.usuarios (username, password, nombre_completo, rol, estado, fecha_creacion) 
VALUES ('tecnico', 'cbf29ce484c0e4342c2d0eb3b6f2d15f', 'Personal Técnico', 'TECNICO', 'ACTIVO', NOW())
ON DUPLICATE KEY UPDATE 
  password = 'cbf29ce484c0e4342c2d0eb3b6f2d15f',
  nombre_completo = 'Personal Técnico',
  rol = 'TECNICO';
```

## 5. REINICIAR LA APLICACIÓN

1. En NetBeans, haz clic derecho en el proyecto
2. Selecciona "Run" o usa F6
3. Espera a que se despliegue

## 6. ACCEDER Y PROBAR

1. Abre: http://localhost:8080/SistemaInventarioV3/
2. Login con:
   - Usuario: admin
   - Contraseña: admin123
3. Haz clic en "Inventario"
4. Deberías ver la tabla llena con PCs y Laptops

## SOLUCIÓN DE PROBLEMAS

### La tabla sigue vacía:
1. Verifica que ejecutaste el script SQL sin errores
2. Confirma en MySQL Workbench que hay datos en las tablas `pcs` y `laptops`
3. Revisa la consola del navegador (F12 > Console) para errores
4. Verifica que la contraseña MySQL sea correcta en persistence.xml:
   ```xml
   <property name="javax.persistence.jdbc.password" value="1234" />
   ```

### Error 404 en la API:
1. Verifica que la aplicación esté desplegada correctamente
2. Abre: http://localhost:8080/SistemaInventarioV3/resources/inventario/pcs
3. Deberías ver una respuesta JSON

### Error de conexión a BD:
1. Verifica que MySQL esté corriendo
2. Verifica el usuario y contraseña en persistence.xml
3. Verifica que la base de datos `inventario_dtic_2026` exista

## VERIFICAR MANUALMENTE EN NAVEGADOR

1. Abre tu navegador
2. Ve a: http://localhost:8080/SistemaInventarioV3/resources/inventario/pcs
3. Deberías ver JSON como:
   ```json
   {
     "success": true,
     "message": "Listado de PCs obtenido",
     "data": [
       {
         "codigoSbai": "EQ-12345",
         "codigoMegan": "SBAI-001",
         "descripcion": "PC de Escritorio",
         ...
       }
     ]
   }
   ```

Si ves datos en el JSON, entonces el problema es solo visual (CSS/JavaScript).
Si no ves datos o hay error, entonces necesitas ejecutar el script SQL.

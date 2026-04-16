# 📊 Guía de Funcionamiento: Cargamiento de Datos del Inventario

## ✅ ¿Cómo funciona el cargamiento de inventario?

### 1. **Flujo de Ejecución**

```
Usuario clic en "Inventario" del menú
    ↓
mostrarPanel('inventario')
    ↓
Se muestra el panel inventario
    ↓
Se llama a: cargarInventario()
    ↓
Fetch a: /inventario/pcs (o /inventario/laptops)
    ↓
InventarioResource.listarPCs() (Backend)
    ↓
BienService.listarPCs() (Servicio)
    ↓
PCDAO.listarTodos() (Acceso a BD)
    ↓
Retorna JSON con datos
    ↓
llenarTablaInventario() llena la tabla
    ↓
Se muestran datos en la tabla ✅
```

---

## 🔍 ¿Cómo Verificar que Funciona?

### **Opción 1: Abrir Consola del Navegador**

1. Abre el navegador y accede a la aplicación
2. Presiona **F12** o **Ctrl+Shift+I** (Chrome) / **Cmd+Option+I** (Mac)
3. Ve a la pestaña **Console**
4. Haz clic en "Inventario" en el menú
5. **Deberías ver logs como:**

```
[cambiarTipoInventario] Cambiando a: pcs
[mostrarPanel] Mostrar panel: inventario
[mostrarPanel] Cargando inventario...
[cargarInventario] Cargando pcs desde: /SistemaInventarioV3/resources/inventario/pcs
[cargarInventario] Response status: 200
[cargarInventario] Datos recibidos: {success: true, data: Array(5), ...}
[cargarInventario] Llenando tabla con 5 registros
[llenarTablaInventario] Tabla llenada con 5 registros
```

### **Opción 2: Revisar Pestaña Network**

1. Abre Consola del Navegador (F12)
2. Ve a **Network**
3. Haz clic en "Inventario"
4. **Deberías ver una request a:**
   - URL: `http://localhost:8080/SistemaInventarioV3/resources/inventario/pcs`
   - Método: **GET**
   - Status: **200** ✅

---

## 🐛 Posibles Errores y Soluciones

### **Error: "No hay datos disponibles"**

**Causa Probable:**
- No hay registros en la base de datos
- La BD no está conectada correctamente

**Solución:**
1. Ve a la tabla `PC` o `LAPTOP` en la BD
2. Verifica que tenga registros
3. Si no hay, carga datos de prueba:

```sql
INSERT INTO PC (codigo_sbai, codigo_megan, marca, modelo, estado) 
VALUES ('PC-001', 'MG-001', 'Dell', 'OptiPlex 5090', 'Activo');

INSERT INTO PC (codigo_sbai, codigo_megan, marca, modelo, estado) 
VALUES ('PC-002', 'MG-002', 'HP', 'EliteDesk 800', 'Activo');
```

---

### **Error: "HTTP Error: 500"**

**Causa Probable:**
- Error en el servidor (InventarioResource.java)
- Error de conexión a BD

**Solución:**
1. Revisa la consola de NetBeans/Tomcat
2. Busca mensajes de error en `[InventarioResource]`
3. Verifica que `BienService` esté correctamente inyectado
4. Verifica la conexión a BD

---

### **Error: "HTTP Error: 404"**

**Causa Probable:**
- El endpoint `/inventario/pcs` no existe
- La ruta no está correctamente mapeada

**Solución:**
1. Verifica que `InventarioResource.java` tenga `@Path("inventario")`
2. Verifica que el método tenga `@Path("pcs")` o `@Path("laptops")`
3. Que tenga `@GET` y `@Produces(MediaType.APPLICATION_JSON)`

---

### **Error: Tabla vacía pero sin mensaje**

**Causa Probable:**
- Los datos se cargan pero la tabla no se llena

**Solución:**
1. Abre Consola (F12)
2. Ve a **Network** y haz clic en la request a inventario
3. Ve a **Response**, deberías ver JSON como:

```json
{
  "success": true,
  "data": [
    {
      "codigoSbai": "PC-001",
      "codigoMegan": "MG-001",
      "marca": "Dell",
      "modelo": "OptiPlex",
      ...
    }
  ],
  ...
}
```

Si ves esto pero la tabla está vacía:
- El HTML podría no tener `id="inventarioBody"`
- Revisa que la tabla tenga: `<tbody id="inventarioBody"></tbody>`

---

## 📋 Estructura de Datos Esperada

La tabla espera estos campos en el JSON:

```javascript
{
  codigoSbai: "PC-001",        // Requerido
  codigoMegan: "MG-001",       // Requerido
  descripcion: "PC de oficina",
  marca: "Dell",
  modelo: "OptiPlex 5090",
  numeroSerie: "ABC123456",
  sn: "ABC123456",             // Alternativa a numeroSerie
  custodioActual: {
    nombre: "Juan Pérez"
  },
  ubicacion: {
    edificio: "A",
    piso: "2",
    detalle: "Oficina 205"
  },
  estado: "Activo",            // "Activo", "Inactivo", "Reportado para baja"
  procesador: "Intel i7",
  ram: "16GB",
  discoDuro: "512GB SSD",
  sistemaOperativo: "Windows 11"
}
```

---

## 🚀 Steps de Prueba Completa

### **Paso 1: Iniciar Sesión**
```
Usuario: admin
Contraseña: admin123
```

### **Paso 2: Hacer Clic en "Inventario"**
- Debería mostrar la tabla con datos

### **Paso 3: Cambiar de Pestaña**
- Haz clic en "Laptops"
- Debería actualizar la tabla
- Vuelve a "Computadores de Escritorio"

### **Paso 4: Abrir Consola**
- Verifica que no haya errores rojos
- Deberías ver los logs como se describe arriba

---

## 📝 Archivos Involucrados

| Archivo | Rol |
|---------|-----|
| `dashboard.html` | Estructura HTML, tabla |
| `index.html` | Estructura HTML alternativa, tabla |
| `js/main.js` | Lógica de cargamiento: `cargarInventario()`, `llenarTablaInventario()` |
| `InventarioResource.java` | Endpoint REST `/inventario/pcs`, `/inventario/laptops` |
| `BienService.java` | Servicio que obtiene datos |
| `PCDAO.java` | Acceso a datos de PCs |
| `LaptopDAO.java` | Acceso a datos de Laptops |
| `estilos.css` | Estilos de tabla (`.data-table`, `.badge`, etc.) |

---

## 🔧 Funciones Clave en main.js

### **cargarInventario()**
- URL: `GET /inventario/{tipo}`
- Parámetros: `tipo` = 'pcs' | 'laptops'
- Retorna: JSON con array de bienes

### **llenarTablaInventario(bienes)**
- Limpia la tabla
- Crea una fila por cada bien
- Formatea datos y los inserta en la tabla

### **cambiarTipoInventario(tipo, button)**
- Cambia `tipoBienActual` a 'pcs' o 'laptops'
- Llama a `cargarInventario()`
- Actualiza botones de pestañas

### **mostrarPanel(nombrePanel)**
- Muestra el panel solicitado
- Si es 'inventario', llama a `cargarInventario()`

---

## 💡 Tips Útiles

✅ **Para debugging:**
- Abre Consola (F12) y verifica los `console.log()`
- Usa Network para ver las requests/responses
- Inspecciona el HTML para ver si la tabla se está llenando

✅ **Para testing:**
- Usa credenciales: admin / admin123
- Inserta datos de prueba en BD antes de probar
- Recarga la página (F5) si cambias datos en BD

✅ **Para optimizar:**
- Los datos se cargan automáticamente al abrir el panel
- No necesitas hacer clic en un botón "Cargar"
- Puedes hacer clic en las pestañas para cambiar tipo

---

## ✨ Confirmación de Funcionamiento Correcto

**Deberías ver:**
- ✅ Tabla con encabezados: Código SBAI, Código Megan, Descripción, Marca, Modelo, S/N, Custodio, Ubicación, Estado, Características, Acciones
- ✅ Filas con datos de PCs o Laptops
- ✅ Badges de color (verde para Activo, naranja para Inactivo, rojo para Reportado)
- ✅ Botones de Editar (✏️) y Ver (📜) en cada fila
- ✅ Pestañas "Computadores de Escritorio" y "Laptops" funcionando
- ✅ Scroll horizontal en móviles si hay muchas columnas

---

**¡Si todo funciona así, estás listo para usar el sistema! 🎉**

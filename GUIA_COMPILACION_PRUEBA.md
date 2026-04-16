# Instrucciones para Compilar y Probar la Interfaz Mejorada

## 1. Compilar con Maven

Ejecuta uno de estos comandos en la raíz del proyecto:

### Opción A: Con Maven instalado
```bash
mvn clean install
```

### Opción B: Con Maven Wrapper (si está disponible)
```bash
./mvnw clean install
```

### Opción C: Solo compilación sin tests
```bash
mvn clean compile
```

## 2. Ejecutar el Servidor

### En NetBeans
1. Haz clic derecho en el proyecto
2. Selecciona "Run"
3. Si not running automatically o access the application

### Con Maven
```bash
mvn tomcat7:run
```

O

```bash
mvn jetty:run
```

## 3. Acceder a la Aplicación

- **URL**: http://localhost:8080/SistemaInventarioV3/
- **Credenciales de prueba**:
  - Usuario: `admin`
  - Contraseña: `admin123`

## 4. Características Visibles

### Pantalla de Login
- Interfaz limpia con fondo degradado
- Formulario centrado
- Credenciales de prueba mostradas

### Pantalla Principal (Dashboard)
- **Sidebar profesional**: Menú lateral azul con opciones:
  - 🏠 Inicio
  - 📦 Inventario
  - ➕ Nuevo Equipo
  - 🔍 Búsqueda
  - 📊 Reportes

### Pantalla de Bienvenida (Inicio)
1. Título: "Bienvenido al Sistema SENADI"
2. Tres tarjetas de acceso rápido:
   - Añadir Nuevo Equipo
   - Búsqueda Avanzada
   - Descargar Reportes
3. Las tarjetas tienen efectos hover suaves

### Pantalla de Inventario
1. Pestañas para cambiar entre PCs y Laptops
2. Tabla con las siguientes columnas:
   - Código SBAI
   - Código Megan
   - Descripción
   - Marca
   - Modelo
   - Número de Serie
   - Custodio
   - Ubicación
   - Estado (con badge de color)
   - Características
   - Acciones (Editar, Ver)

### Otros Paneles
- **Nuevo Equipo**: Formulario para registrar equipos
- **Búsqueda**: Búsqueda avanzada por criterios
- **Reportes**: Descargar reportes en Excel

## 5. Validar Cambios CSS

Para verificar que los estilos se han aplicado correctamente:

1. Abre la consola del navegador (F12)
2. Verifica que no haya errores en la pestaña "Console"
3. En la pestaña "Network", confirma que `estilos.css` se carga correctamente

## 6. Troubleshooting

### Estilos no se ven
- **Solución**: Limpia el caché del navegador (Ctrl+F5 en Windows)
- Verifica que CSS no tenga errores de sintaxis

### Tablas no se muestran correctamente
- Verifica la consola del navegador para errores de JavaScript
- Asegúrate de que los datos se cargan desde la API

### Datos de inventario vacíos
- Verifica que la base de datos esté poblada
- Ejecuta los scripts SQL iniciales si es necesario

## 7. Cambios Principales Realizados

### Archivos Modificados:
1. **css/estilos.css**
   - Colores profesionales
   - Sidebar mejorado
   - Tabla de inventario optimizada
   - Efectos hover suaves
   - Responsive design

2. **index.html**
   - Menú simplificado a 5 opciones
   - Pantalla de bienvenida mejorada
   - Estructura HTML más limpia

3. **js/main.js**
   - Función `llenarTablaInventario` actualizada
   - Compatibilidad con nueva estructura

## 8. Pasos de Prueba Recomendados

1. ✅ Inicia sesión con admin/admin123
2. ✅ Verifica la pantalla de bienvenida con accesos rápidos
3. ✅ Haz clic en "Inventario" y visualiza la tabla
4. ✅ Cambia entre pestañas (PCs/Laptops)
5. ✅ Prueba "Nuevo Equipo" y verifica el formulario
6. ✅ Prueba "Búsqueda" y busca equipos
7. ✅ Verifica "Reportes" y descarga un archivo
8. ✅ Prueba desde diferentes dispositivos (responsive)

## 9. Próximas Mejoras

- Agregar gráficos de estadísticas
- Implementar búsqueda en tiempo real
- Agregar más filtros en tabla
- Crear vista de detalles de equipos
- Mejorar exportación de reportes

## Notas Importantes

- Los datos mostrados provienen de la API REST del backend
- La tabla se actualiza dinámicamente desde la base de datos
- Los estilos son totalmente responsive
- Compatible con navegadores modernos (Chrome, Firefox, Edge, Safari)

## Soporte

Si encuentras problemas:
1. Revisa los archivos modificados (CSS, HTML, JS)
2. Verifica la consola del navegador para errores
3. Confirma que el servidor esté ejecutándose
4. Revisa que la base de datos esté disponible

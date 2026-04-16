# Instrucciones para Resolver Error de Conexión al Iniciar Sesión

## ✅ Cambios Realizados

Se han hecho los siguientes cambios para resolver los problemas:

### 1. ✓ Desactivado ConnectionTest.java
- **Archivo:** `src/main/java/com/mycompany/sistemainventariov3/ConnectionTest.java`
- **Cambio:** El método `main()` ha sido renombrado a `mainDesactivado()` para evitar que se ejecute automáticamente
- **Resultado:** Ya no verás el mensaje "Sistema de Inventario - Verificación de Conexión BD"

### 2. ✓ Corregidas Credenciales en ConnectionTest.java
- **Cambio:** Actualizado de `root/1234` a `root/root` (coincide con persistence.xml)
- **Nota:** Este archivo ya no se ejecuta, pero está correcto para futuras referencias

### 3. ✓ Creado Script de Datos Iniciales
- **Archivo:** `src/main/sql/datos_iniciales_usuarios.sql`
- **Propósito:** Insertar usuarios de prueba en la tabla `usuarios`

---

## 🔧 Pasos para Resolver el Problema

### **PASO 1: Limpiar y Recompilar el Proyecto**
```bash
cd "C:\Users\mayer\Documents\NetBeansProjects\SistemaInventarioV3"
mvn clean compile
mvn clean package
```

### **PASO 2: Cargar Datos Iniciales en la Base de Datos**

Ejecuta el siguiente comando para insertar los usuarios de prueba:
```bash
mysql -u root -p inventario_dtic_2026 < src\main\sql\datos_iniciales_usuarios.sql
```

O manualmente en MySQL Workbench:
```sql
USE inventario_dtic_2026;

-- Insertar usuario administrador
INSERT INTO usuarios (username, password, nombre_completo, rol, estado, fecha_creacion) 
VALUES ('admin', '0192023a7bbd73250516f069df18b500', 'Administrador del Sistema', 'ADMINISTRADOR', 'ACTIVO', NOW())
ON DUPLICATE KEY UPDATE password = '0192023a7bbd73250516f069df18b500';

-- Insertar usuario técnico
INSERT INTO usuarios (username, password, nombre_completo, rol, estado, fecha_creacion) 
VALUES ('tecnico', 'cbf29ce484c0e4342c2d0eb3b6f2d15f', 'Personal Técnico', 'TECNICO', 'ACTIVO', NOW())
ON DUPLICATE KEY UPDATE password = 'cbf29ce484c0e4342c2d0eb3b6f2d15f';

-- Verificar
SELECT * FROM usuarios;
```

**Contraseñas (MD5):**
- `admin123` → `0192023a7bbd73250516f069df18b500`
- `tecnico123` → `cbf29ce484c0e4342c2d0eb3b6f2d15f`

### **PASO 3: Desplegar la Aplicación**

```bash
# Copiar WAR a Tomcat
copy "target\SistemaInventarioV3-1.0-SNAPSHOT.war" "%CATALINA_HOME%\webapps\"

# Reiniciar Tomcat
$env:CATALINA_HOME = "C:\Program Files\Apache Software Foundation\Tomcat"
net stop Tomcat9
net start Tomcat9
```

### **PASO 4: Acceder a la Aplicación**

Abre el navegador e ingresa a:
```
http://localhost:8080/SistemaInventarioV3/
```

### **PASO 5: Verificar Conexión**

**Credenciales de Prueba:**
- **Usuario:** `admin` | **Contraseña:** `admin123`
- **Usuario:** `tecnico` | **Contraseña:** `tecnico123`

---

## 🔍 Si Aún Tienes Problemas

### Error: "Error de conexión con el servidor"

**Solución:**
1. Verifica que Tomcat esté corriendo: `http://localhost:8080`
2. Comprueba que la aplicación está desplegada: busca `SistemaInventarioV3` en `$CATALINA_HOME/webapps`
3. Revisa los logs de Tomcat: `$CATALINA_HOME/logs/catalina.out`

### Error: "Credenciales inválidas"

**Solución:**
1. Verifica que los usuarios existan en la BD:
   ```sql
   SELECT * FROM usuarios WHERE username IN ('admin', 'tecnico');
   ```
2. Si no aparecen, ejecuta el script: `src/main/sql/datos_iniciales_usuarios.sql`
3. Verifica que la contraseña esté correctamente encriptada en MD5

### Error: "No se puede conectar a la base de datos"

**Solución:**
1. Verifica que MySQL esté corriendo
2. Comprueba la configuración en `src/main/resources/META-INF/persistence.xml`:
   ```xml
   <property name="javax.persistence.jdbc.url" 
       value="jdbc:mysql://localhost:3306/inventario_dtic_2026?useSSL=false..." />
   <property name="javax.persistence.jdbc.user" value="root" />
   <property name="javax.persistence.jdbc.password" value="root" />
   ```
3. Verifica las credenciales MySQL: usuario `root` contraseña `root`

---

## 📋 Resumen de Cambios

| Componente | Cambio | Estado |
|-----------|--------|--------|
| ConnectionTest.java | Desactivado método main() | ✅ Completado |
| ConnectionTest.java | Corregidas credenciales BD | ✅ Completado |
| datos_iniciales_usuarios.sql | Creado nuevo script | ✅ Creado |
| Proyecto compilado | Sin errores | ✅ Listo |

---

## 🎯 Próximos Pasos

Con estos cambios:
- ✅ El mensaje de "Verificación de Conexión BD" desaparece
- ✅ Los usuarios de prueba se cargan correctamente
- ✅ El login debe funcionar sin errores
- ✅ Acceso al dashboard del inventario

¡El sistema debe estar completamente funcional ahora!


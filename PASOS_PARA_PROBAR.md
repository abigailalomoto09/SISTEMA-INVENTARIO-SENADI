# 🚀 PASOS PARA HACER FUNCIONAR EL LOGIN

## 1️⃣ Limpiar y Compilar en NetBeans

En NetBeans:
- Haz clic derecho en el proyecto **SistemaInventarioV3**
- Selecciona **Clean and Build** (Limpiar y Compilar)
- Espera a que termine (verifica que no haya errores en la ventana de Output)

## 2️⃣ Detener WildFly

En NetBeans:
- Ve a **Services** (Servicios) → **Servers**
- Haz clic derecho en tu servidor WildFly
- Selecciona **Stop** (Detener)
- Espera 5-10 segundos

## 3️⃣ Reiniciar WildFly

En NetBeans:
- Haz clic derecho en el servidor WildFly
- Selecciona **Start** (Iniciar)
- Espera a que inicie (verás mensajes en la ventana de Output)

## 4️⃣ Ejecutar la Aplicación

En NetBeans:
- Haz clic derecho en el proyecto **SistemaInventarioV3**
- Selecciona **Run** (Ejecutar)
- O presiona **F6**
- Espera a que se abra el navegador

## 5️⃣ Verificar que Funciona

En el navegador a http://localhost:8080/SistemaInventarioV3/:

1. **Primero verifica el endpoint de prueba:**
   - Abre una nueva pestaña
   - Ve a: `http://localhost:8080/SistemaInventarioV3/resources/test`
   - Si ves: `{"status":"ok","message":"API funcionando correctamente"}`
   - ✅ Entonces los REST endpoints funcionan

2. **Luego prueba el login:**
   - Vuelve a la pestaña anterior
   - **Usuario:** `admin`
   - **Contraseña:** `admin123`
   - Haz clic en "Iniciar Sesión"

3. **Si aparece el Dashboard:**
   - ✅ ¡El sistema funciona!
   - Prueba con `tecnico` / `tecnico123`

---

## 🐛 Si Aún Hay Errores

### En la ventana **Output** de NetBeans, busca:

✅ **Deberías ver:**
```
[LoginResource] Inicializado correctamente
===== INICIALIZANDO DATOS ====
✓ Creando usuario: admin
✓ Usuario 'admin' creado exitosamente
✓ Creando usuario: tecnico
✓ Usuario 'tecnico' creado exitosamente
===== INICIALIZACIÓN COMPLETADA ====
```

❌ **Si ves errores, copia-pega en la siguiente pregunta**

---

## 📝 Resumen de Cambios Realizados

- ✅ LoginResource mejorado con logs detallados
- ✅ TestResource creado para verificar que API funciona
- ✅ DataLoader creado para crear usuarios automáticamente
- ✅ Mejor manejo de errores y respuestas JSON

---

**Sigue estos pasos y reporta qué sucede. 👍**

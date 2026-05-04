-- =============================================================================
-- SCRIPT: Actualización de Base de Datos - Credenciales del Sistema
-- =============================================================================
-- Asegurar que los usuarios de prueba existan con la contraseña correcta
-- NOTA: La contraseña admin123 en MD5 = 0192023a7bbd73250516f069df18b500
-- NOTA: La contraseña tecnico123 en MD5 = cbf29ce484c0e4342c2d0eb3b6f2d15f
-- =============================================================================

USE inventario_dtic_2026;

-- Verificar que la tabla usuarios existe
SELECT COUNT(*) as "Usuarios Existentes" FROM usuarios;

-- Insertar o actualizar usuario administrador
INSERT INTO usuarios (username, password, nombre_completo, rol, estado, fecha_creacion) 
VALUES ('admin', '0192023a7bbd73250516f069df18b500', 'Administrador Sistema', 'ADMINISTRADOR', 'ACTIVO', NOW())
ON DUPLICATE KEY UPDATE 
  password = '0192023a7bbd73250516f069df18b500',
  nombre_completo = 'Administrador Sistema',
  rol = 'ADMINISTRADOR',
  estado = 'ACTIVO';

-- Insertar o actualizar usuario técnico
INSERT INTO usuarios (username, password, nombre_completo, rol, estado, fecha_creacion) 
VALUES ('tecnico', 'cbf29ce484c0e4342c2d0eb3b6f2d15f', 'Personal Técnico', 'TECNICO', 'ACTIVO', NOW())
ON DUPLICATE KEY UPDATE 
  password = 'cbf29ce484c0e4342c2d0eb3b6f2d15f',
  nombre_completo = 'Personal Técnico',
  rol = 'TECNICO',
  estado = 'ACTIVO';

-- Verificar que los usuarios fueron creados/actualizados correctamente
SELECT id_usuario, username, SUBSTRING(password, 1, 8) as 'password_inicio', nombre_completo, rol, estado, fecha_creacion 
FROM usuarios 
WHERE username IN ('admin', 'tecnico')
ORDER BY id_usuario;

-- =============================================================================
-- NUEVA TABLA: usuario_roles para multi-rol (Paul admin+custodio)
-- =============================================================================

-- Crear tabla usuario_roles
CREATE TABLE IF NOT EXISTS usuario_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  rol ENUM('ADMINISTRADOR','TECNICO','CUSTODIO') NOT NULL,
  fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  UNIQUE KEY unique_user_rol (id_usuario, rol)
) ENGINE=InnoDB;

-- Popular roles existentes (admin/tecnico)
INSERT INTO usuario_roles (id_usuario, rol) 
SELECT id_usuario, rol FROM usuarios WHERE rol IS NOT NULL
ON DUPLICATE KEY UPDATE rol=VALUES(rol);

-- Ejemplo multi-rol: Crear/actualizar Paul (admin+custodio)
INSERT INTO usuarios (username, password, nombre_completo, rol, estado, fecha_creacion) 
VALUES ('paul', '0192023a7bbd73250516f069df18b500', 'Paul Zambrano', NULL, 'ACTIVO', NOW())
ON DUPLICATE KEY UPDATE 
  password = '0192023a7bbd73250516f069df18b500',
  nombre_completo = 'Paul Zambrano',
  rol = NULL,
  estado = 'ACTIVO';

-- Asignar multi-rol a Paul
INSERT INTO usuario_roles (id_usuario, rol) VALUES 
((SELECT id_usuario FROM usuarios WHERE username='paul'), 'ADMINISTRADOR'),
((SELECT id_usuario FROM usuarios WHERE username='paul'), 'CUSTODIO')
ON DUPLICATE KEY UPDATE fecha_asignacion=NOW();

-- Verificar
SELECT u.username, u.nombre_completo, GROUP_CONCAT(ur.rol SEPARATOR ', ') as roles 
FROM usuarios u 
LEFT JOIN usuario_roles ur ON u.id_usuario=ur.id_usuario 
WHERE u.username IN ('admin','tecnico','paul')
GROUP BY u.id_usuario;

-- =============================================================================
-- Ejecutar este script completo en MySQL para migrar
-- =============================================================================

-- Si los usuarios no existen, esto es lo que necesita ser ejecutado en MySQL:
-- La tabla se crea automáticamente si no existe mediante JPA con la anotación @Entity

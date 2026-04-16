# Validacion Local Sin PATH Global

Este proyecto ya incluye herramientas locales para validar aunque `mvn` no este en el `PATH` y aunque no exista `node`.

## VS Code

Si trabajas en VS Code, ya puedes usar `Terminal > Run Task` con estas tareas:

- `Frontend: Validar`
- `Proyecto: Validar completo`
- `Proyecto: Empaquetar WAR`
- `Proyecto: Solo validar sin compilar`
- `App: Abrir en navegador`

Tambien tienes perfiles en `Run and Debug`:

- `Abrir App en Edge`
- `Abrir App en Chrome`
- `Adjuntar a Java 5005`
- `Validar y abrir app`

## Maven local

Usa:

```powershell
.\mvnw.cmd -q -DskipTests package
```

`mvnw.cmd` busca Maven en estas rutas conocidas:

- `C:\Program Files\NetBeans-12.6\netbeans\java\maven\bin\mvn.cmd`
- `%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.6.3-bin\1iopthnavndlasol9gbrbg6bf2\apache-maven-3.6.3\bin\mvn.cmd`

## Validacion frontend sin Node

Usa:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Validate-Frontend.ps1
```

La validacion revisa:

- referencias `href` y `src` locales en HTML
- existencia de archivos enlazados
- balance basico de delimitadores en CSS y JS

## Validacion completa

Usa:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Validate-Project.ps1
```

Opcional, para evitar compilar:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Validate-Project.ps1 -SkipBuild
```

## Abrir la aplicacion

Usa:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Open-App.ps1
```

Opcional con otra URL:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Open-App.ps1 -Url "http://localhost:8080/SistemaInventarioV3/"
```

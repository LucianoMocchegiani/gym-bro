# Git hooks (versión en el repo)

Carpeta: **`git-hooks/`** (plantillas versionadas).  
No confundir con **`.git/hooks/`** (hooks locales que Git ejecuta de verdad).

Estos archivos **sí se pushean**. Git no usa `git-hooks/` sola: hay que copiarlos a `.git/hooks/` en cada clone.

## commit-msg

Quita del mensaje de commit la línea:

`Co-authored-by: Cursor <cursoragent@cursor.com>`

### Instalar (Windows PowerShell)

Desde la raíz del repo:

```powershell
Copy-Item -Force git-hooks\commit-msg .git\hooks\commit-msg
```

### Instalar (Git Bash / macOS / Linux)

```bash
cp git-hooks/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg
```

`.git/hooks/` es local y no se versiona; por eso este paso es necesario una vez por máquina/clone.

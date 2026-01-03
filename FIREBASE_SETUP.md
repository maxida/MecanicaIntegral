# 🔧 Configuración de Firebase Auth

## Problema: auth/configuration-not-found

Este error ocurre cuando los usuarios NO existen en Firebase Authentication. Necesitas crearlos manualmente o usar el script de inicialización.

## ✅ Solución Rápida (Manual)

### Opción 1: Crear usuarios directamente en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona el proyecto **mit-app-9fed5**
3. Ve a **Autenticación** > **Usuarios**
4. Haz clic en **Agregar usuario**
5. Crea los 4 usuarios:

| Email | Contraseña | Rol |
|-------|-----------|-----|
| `santiago@mit.com` | `123456` | admin |
| `oasis@mit.com` | `123456` | supervisor |
| `mecanico@mit.com` | `123456` | mecanico |
| `camion1@mit.com` | `123456` | cliente |

### Opción 2: Usar el script de inicialización automática

1. **Descarga tu Service Account Key**:
   - Firebase Console → Proyecto → Configuración ⚙️
   - Pestaña "Cuentas de Servicio"
   - Botón "Generar nueva clave privada"
   - Guarda como `serviceAccountKey.json` en la raíz del proyecto

2. **Instala dependencias necesarias**:
```bash
npm install firebase-admin --save-dev
npm install --save-dev @types/node
```

3. **Ejecuta el script**:
```bash
npx ts-node scripts/initializeFirebaseUsers.ts
```

## 📝 Crear el documento de usuarios en Firestore

Después de crear los usuarios en Auth, asegúrate de que existan en Firestore:

**Colección**: `usuarios`

**Documento ejemplo** (UID del usuario):
```json
{
  "uid": "usuario_uid_de_firebase_auth",
  "email": "santiago@mecanicaintegral.com",
  "nombre": "Santiago",
  "rol": "admin",
  "createdAt": "timestamp",
  "estado": "activo"
}
```

## 🧪 Testear la Autenticación

Intenta loguear con:
```
Email: santiago@mit.com
Contraseña: 123456
```

Si funciona, verás el dashboard del admin.

## ⚠️ Notas Importantes

- ✅ AsyncStorage ya está configurado en `firebaseConfig.ts`
- ✅ Las credenciales de Firebase están correctas
- ❌ Lo que falta: Usuarios en Firebase Auth

## 🔍 Debugging

Si aún tienes errores, verifica:

1. **¿Existen los usuarios en Firebase Console?**
   - Autenticación > Usuarios
   - Deberías ver los 4 usuarios listados

2. **¿Está correcta la colección "usuarios" en Firestore?**
   - Firestore Database > Colección "usuarios"
   - Deberías ver documentos con los UIDs

3. **¿Está actualizado el código?**
   - Reinicia la app: `npm run android` o `npm run ios`

---

**Próximos pasos después de crear usuarios:**
- [ ] Login funciona correctamente
- [ ] Integrar Turnos con Redux y Firebase
- [ ] Integrar Checklist con Firebase persistence

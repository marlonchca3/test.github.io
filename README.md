# Iglesias del Callao

App web en Vue 3 + Vite para mostrar iglesias del Callao a tus clientes. El sitio queda en modo lectura para el público y solo el administrador autenticado puede crear o editar iglesias.

## Configuración

1. Crea un archivo `.env.local` en la raíz del proyecto usando como base `.env.example`.
2. Copia las credenciales de tu proyecto de Firebase Web App.
3. Asegúrate de que tu colección en Firestore se llame `iglesias`.
4. Define `VITE_ADMIN_EMAIL` con el correo que usarás para entrar como administrador.
5. En Firebase Authentication habilita el proveedor `Google`.
6. Inicia sesión con ese mismo correo de Google para entrar como administrador.

## Variables necesarias

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_ADMIN_EMAIL`

## Reglas de Firestore para producción

La app está pensada para la ruta de documentos `iglesias/{iglesiaId}`. Si quieres que solo tú puedas editar y tus clientes solo vean lo publicado, deja lectura pública y escritura solo para tu cuenta admin.

```txt
rules_version = '2';

service cloud.firestore {
	match /databases/{database}/documents {
		match /iglesias/{iglesiaId} {
			allow read: if true;
			allow write: if request.auth != null && request.auth.token.email == "TU_CORREO_ADMIN";
		}
	}
}
```

Reemplaza `TU_CORREO_ADMIN` por el correo real de tu cuenta de Google administradora.

Si mantienes `allow write: if true;`, cualquier cliente podrá escribir directamente en Firestore aunque el botón de admin esté oculto.

## Ejecutar

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

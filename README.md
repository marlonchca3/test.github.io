# Iglesias del Callao

App web en Vue 3 + Vite para listar, crear y editar iglesias guardadas en Firestore. Al modificar los campos `name` y `address` desde la interfaz, el documento se actualiza en la colección `iglesias`.

## Configuración

1. Crea un archivo `.env.local` en la raíz del proyecto usando como base `.env.example`.
2. Copia las credenciales de tu proyecto de Firebase Web App.
3. Asegúrate de que tu colección en Firestore se llame `iglesias`.

## Variables necesarias

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Reglas usadas

La app está pensada para la ruta de documentos `iglesias/{iglesiaId}`. Las reglas que compartiste permiten lectura y escritura abierta para esa colección:

```txt
rules_version = '2';

service cloud.firestore {
	match /databases/{database}/documents {
		match /iglesias/{iglesiaId} {
			allow read: if true;
			allow write: if true;
		}
	}
}
```

Esas reglas sirven para pruebas rápidas, pero no son adecuadas para producción.

## Ejecutar

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
### Deploy Trigger
Last deployment triggered on: Tue Apr 21 11:21:23 -05 2026

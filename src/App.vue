<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { auth, db, hasFirebaseConfig } from './firebase'

const iglesias = ref([])
const selectedId = ref('')
const loading = ref(true)
const saving = ref(false)
const creating = ref(false)
const deleting = ref(false)
const authLoading = ref(true)
const loginLoading = ref(false)
const feedback = ref('')
const errorMessage = ref('')
const adminPanelOpen = ref(false)
const currentUser = ref(null)

const editForm = reactive({
  name: '',
  address: '',
  horario: '',
})

const createForm = reactive({
  name: '',
  address: '',
  horario: '',
})

const loginForm = reactive({
  email: '',
  password: '',
})

let unsubscribe = null
let unsubscribeAuth = null
const googleProvider = auth ? new GoogleAuthProvider() : null

const selectedChurch = computed(() =>
  iglesias.value.find((iglesia) => iglesia.id === selectedId.value) ?? null,
)
const isAdmin = computed(() => !!currentUser.value)

function fillEditForm(iglesia) {
  editForm.name = iglesia?.name ?? ''
  editForm.address = iglesia?.address ?? ''
  editForm.horario = iglesia?.horario ?? ''
}

function selectChurch(iglesia) {
  selectedId.value = iglesia.id
  fillEditForm(iglesia)
  feedback.value = ''
  errorMessage.value = ''
}

function resetCreateForm() {
  createForm.name = ''
  createForm.address = ''
  createForm.horario = ''
}

function openAdminPanel() {
  adminPanelOpen.value = true
  feedback.value = ''
  errorMessage.value = ''
}

function closeAdminPanel() {
  adminPanelOpen.value = false
  loginForm.password = ''
}

async function loginWithGoogle() {
  if (!auth) {
    errorMessage.value = 'Firebase Auth no está configurado.'
    return
  }

  loginLoading.value = true
  errorMessage.value = ''
  feedback.value = ''

  try {
    await signInWithPopup(auth, googleProvider)
    adminPanelOpen.value = false
    feedback.value = 'Sesión de administrador iniciada.'
  } catch (error) {
    errorMessage.value = `No se pudo iniciar sesión: ${error.message}`
  } finally {
    loginLoading.value = false
  }
}

async function loginWithEmail() {
  if (!auth) {
    errorMessage.value = 'Firebase Auth no está configurado.'
    return
  }

  if (!loginForm.email.trim() || !loginForm.password) {
    errorMessage.value = 'Ingresa tu correo y contraseña.'
    return
  }

  loginLoading.value = true
  errorMessage.value = ''
  feedback.value = ''

  try {
    await signInWithEmailAndPassword(auth, loginForm.email.trim(), loginForm.password)

    loginForm.password = ''
    adminPanelOpen.value = false
    feedback.value = 'Sesión de administrador iniciada.'
  } catch (error) {
    errorMessage.value = `No se pudo iniciar sesión: ${error.message}`
  } finally {
    loginLoading.value = false
  }
}

async function logoutAdmin() {
  if (!auth) {
    return
  }

  try {
    await signOut(auth)
    feedback.value = 'Sesión de administrador cerrada.'
  } catch (error) {
    errorMessage.value = `No se pudo cerrar sesión: ${error.message}`
  }
}

async function saveChurch() {
  if (!isAdmin.value) {
    errorMessage.value = 'Solo el administrador puede guardar cambios.'
    return
  }

  if (!selectedChurch.value) {
    errorMessage.value = 'Selecciona una iglesia antes de guardar cambios.'
    return
  }

  const name = editForm.name.trim()
  const address = editForm.address.trim()
  const horario = editForm.horario.trim()

  if (!name || !address || !horario) {
    errorMessage.value = 'Name, address y horario son obligatorios.'
    return
  }

  saving.value = true
  errorMessage.value = ''
  feedback.value = ''

  try {
    await updateDoc(doc(db, 'iglesias', selectedChurch.value.id), {
      name,
      address,
      horario,
      updatedAt: serverTimestamp(),
    })
    feedback.value = 'Cambios guardados en Firestore.'
  } catch (error) {
    errorMessage.value = `No se pudo actualizar: ${error.message}`
  } finally {
    saving.value = false
  }
}

async function createChurch() {
  if (!isAdmin.value) {
    errorMessage.value = 'Solo el administrador puede crear iglesias.'
    return
  }

  const name = createForm.name.trim()
  const address = createForm.address.trim()
  const horario = createForm.horario.trim()

  if (!name || !address || !horario) {
    errorMessage.value = 'Completa name, address y horario para crear una iglesia.'
    return
  }

  creating.value = true
  errorMessage.value = ''
  feedback.value = ''

  try {
    await addDoc(collection(db, 'iglesias'), {
      name,
      address,
      horario,
      city: 'Callao',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    resetCreateForm()
    feedback.value = 'Iglesia creada en Firestore.'
  } catch (error) {
    errorMessage.value = `No se pudo crear: ${error.message}`
  } finally {
    creating.value = false
  }
}

async function deleteChurch() {
  await deleteChurchById(selectedChurch.value?.id)
}

async function deleteChurchById(churchId) {
  if (!isAdmin.value) {
    errorMessage.value = 'Solo los usuarios autenticados pueden borrar iglesias.'
    return
  }

  const churchToDelete = iglesias.value.find((iglesia) => iglesia.id === churchId) ?? null

  if (!churchToDelete) {
    errorMessage.value = 'Selecciona una iglesia antes de borrarla.'
    return
  }

  const confirmed = window.confirm(
    `Vas a borrar "${churchToDelete.name || 'esta iglesia'}". Esta acción no se puede deshacer.`,
  )

  if (!confirmed) {
    return
  }

  deleting.value = true
  errorMessage.value = ''
  feedback.value = ''

  try {
    await deleteDoc(doc(db, 'iglesias', churchToDelete.id))
    feedback.value = 'Iglesia eliminada de Firestore.'
  } catch (error) {
    errorMessage.value = `No se pudo borrar: ${error.message}`
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  if (!hasFirebaseConfig) {
    loading.value = false
    errorMessage.value = 'Falta configurar Firebase en el archivo .env.local.'
    authLoading.value = false
    return
  }

  if (!auth) {
    authLoading.value = false
  } else {
    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      currentUser.value = user
      authLoading.value = false
    })
  }

  const iglesiasQuery = query(collection(db, 'iglesias'), orderBy('name'))

  unsubscribe = onSnapshot(
    iglesiasQuery,
    (snapshot) => {
      iglesias.value = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }))

      if (!iglesias.value.length) {
        selectedId.value = ''
        fillEditForm(null)
      } else {
        const current = iglesias.value.find((iglesia) => iglesia.id === selectedId.value)
        if (current) {
          fillEditForm(current)
        } else {
          selectChurch(iglesias.value[0])
        }
      }

      loading.value = false
    },
    (error) => {
      loading.value = false
      errorMessage.value = `No se pudo leer Firestore: ${error.message}`
    },
  )
})

onUnmounted(() => {
  unsubscribe?.()
  unsubscribeAuth?.()
})
</script>

<template>
  <main class="layout">
    <section class="hero-panel">
      <div class="hero-topbar">
        <div>
          <p class="eyebrow">Directorio vivo</p>
          <h1>Iglesias del Callao</h1>
        </div>

        <div class="admin-actions">
          <button v-if="!isAdmin" class="ghost-button" type="button" @click="openAdminPanel">
            Admin
          </button>
          <button v-else class="ghost-button active" type="button" @click="logoutAdmin">
            Salir admin
          </button>
        </div>
      </div>
      <p class="lead">
        Tus clientes solo verán la información publicada. El botón <strong>Admin</strong> abre el
        acceso para que las personas autenticadas puedan editar <strong>name</strong> y
        <strong>address</strong> en Firestore.
      </p>

      <div class="hero-notes">
        <article>
          <span class="note-label">Colección</span>
          <strong>iglesias</strong>
        </article>
        <article>
          <span class="note-label">Campos editables</span>
          <strong>name, address, horario</strong>
        </article>
        <article>
          <span class="note-label">Sincronización</span>
          <strong>Firestore en tiempo real</strong>
        </article>
      </div>

      <div v-if="adminPanelOpen && !isAdmin" class="admin-login-card">
        <div class="panel-heading compact">
          <div>
            <p class="panel-kicker">Acceso privado</p>
            <h2>Entrar con Google</h2>
          </div>
          <button class="text-button" type="button" @click="closeAdminPanel">Cerrar</button>
        </div>

        <div class="form-grid">
          <p class="status">
            Se abrirá el inicio de sesión de Google. Cualquier usuario autenticado podrá entrar al
            panel de edición.
          </p>

          <button
            class="primary-button"
            type="button"
            :disabled="loginLoading || authLoading"
            @click="loginWithGoogle"
          >
            {{ loginLoading ? 'Abriendo Google...' : 'Entrar con Google' }}
          </button>

          <div class="login-divider">
            <span>o</span>
          </div>

          <form class="form-grid" @submit.prevent="loginWithEmail">
            <label>
              <span>Correo</span>
              <input v-model="loginForm.email" type="email" placeholder="usuario@correo.com" />
            </label>

            <label>
              <span>Contraseña</span>
              <input v-model="loginForm.password" type="password" placeholder="Tu contraseña" />
            </label>

            <button class="secondary-button" type="submit" :disabled="loginLoading || authLoading">
              {{ loginLoading ? 'Ingresando...' : 'Entrar con email' }}
            </button>
          </form>
        </div>
      </div>
    </section>

    <section class="content-grid">
      <aside class="panel list-panel">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Registros</p>
            <h2>Iglesias disponibles</h2>
          </div>
          <span class="pill">{{ iglesias.length }}</span>
        </div>

        <p v-if="loading" class="status">Cargando iglesias desde Firestore...</p>

        <ul v-else-if="iglesias.length" class="church-list">
          <li v-for="iglesia in iglesias" :key="iglesia.id">
            <div class="church-card" :class="{ active: iglesia.id === selectedId }">
              <button class="church-card-main" type="button" @click="selectChurch(iglesia)">
                <strong>{{ iglesia.name || 'Sin nombre' }}</strong>
                <span>{{ iglesia.address || 'Sin dirección' }}</span>
                <span>{{ iglesia.horario || 'Sin horario' }}</span>
              </button>

              <button
                v-if="isAdmin"
                class="inline-delete-button"
                type="button"
                :disabled="deleting"
                @click="deleteChurchById(iglesia.id)"
              >
                {{ deleting && iglesia.id === selectedId ? 'Borrando...' : 'Eliminar' }}
              </button>
            </div>
          </li>
        </ul>

        <p v-else class="status empty-state">
          No hay documentos en <strong>iglesias</strong>. Usa el formulario para crear el primero.
        </p>
      </aside>

      <section class="panel details-panel">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Vista pública</p>
            <h2>{{ selectedChurch?.name || 'Selecciona una iglesia' }}</h2>
          </div>
        </div>

        <div v-if="selectedChurch" class="details-stack">
          <div>
            <span class="detail-label">Dirección</span>
            <p class="detail-copy">{{ selectedChurch.address || 'Sin dirección registrada' }}</p>
          </div>
          <div>
            <span class="detail-label">Horario</span>
            <p class="detail-copy">{{ selectedChurch.horario || 'Sin horario registrado' }}</p>
          </div>
          <div>
            <span class="detail-label">Ciudad</span>
            <p class="detail-copy">{{ selectedChurch.city || 'Callao' }}</p>
          </div>
          <p class="status">
            Tus clientes verán esta información exactamente como la dejes guardada.
          </p>
        </div>

        <p v-else class="status">Elige una iglesia para ver sus datos públicos.</p>
      </section>

      <section v-if="isAdmin" class="panel editor-panel">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Edición admin</p>
            <h2>{{ selectedChurch?.name || 'Actualizar iglesia' }}</h2>
          </div>
          <span class="pill secure">Privado</span>
        </div>

        <form class="form-grid" @submit.prevent="saveChurch">
          <label>
            <span>Name</span>
            <input v-model="editForm.name" type="text" placeholder="Parroquia San José" />
          </label>

          <label>
            <span>Address</span>
            <textarea
              v-model="editForm.address"
              rows="4"
              placeholder="Av. Sáenz Peña 250, Callao"
            ></textarea>
          </label>

          <label>
            <span>Horario</span>
            <input v-model="editForm.horario" type="text" placeholder="Lun a Vie 7:00 pm - 8:00 pm" />
          </label>

          <p class="status" v-if="selectedChurch">
            Estás editando la iglesia seleccionada en la columna de registros.
          </p>

          <div class="form-actions">
            <button class="primary-button" type="submit" :disabled="saving || deleting || !selectedChurch">
              {{ saving ? 'Guardando...' : 'Guardar en Firestore' }}
            </button>

            <button
              class="danger-button"
              type="button"
              :disabled="deleting || saving || !selectedChurch"
              @click="deleteChurch"
            >
              {{ deleting ? 'Borrando...' : 'Borrar iglesia' }}
            </button>
          </div>
        </form>
      </section>

      <section v-if="isAdmin" class="panel create-panel">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Alta admin</p>
            <h2>Nueva iglesia</h2>
          </div>
        </div>

        <form class="form-grid" @submit.prevent="createChurch">
          <label>
            <span>Name</span>
            <input v-model="createForm.name" type="text" placeholder="Iglesia Matriz" />
          </label>

          <label>
            <span>Address</span>
            <textarea
              v-model="createForm.address"
              rows="4"
              placeholder="Jr. Constitución 120, Callao"
            ></textarea>
          </label>

          <label>
            <span>Horario</span>
            <input v-model="createForm.horario" type="text" placeholder="Domingos 8:00 am y 6:00 pm" />
          </label>

          <button class="secondary-button" type="submit" :disabled="creating">
            {{ creating ? 'Creando...' : 'Crear documento' }}
          </button>
        </form>
      </section>
    </section>

    <section v-if="!isAdmin" class="public-note">
      <p>
        El sitio está en modo público. Solo los usuarios autenticados pueden crear o editar
        iglesias.
      </p>
    </section>

    <section v-if="feedback || errorMessage || !hasFirebaseConfig" class="feedback-strip">
      <p v-if="feedback" class="feedback success">{{ feedback }}</p>
      <p v-if="errorMessage" class="feedback error">{{ errorMessage }}</p>
      <p v-if="!hasFirebaseConfig" class="feedback warning">
        Configura las variables de Firebase en <strong>.env.local</strong> para conectar la app.
      </p>
    </section>
  </main>
</template>

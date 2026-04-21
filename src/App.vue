<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db, hasFirebaseConfig } from './firebase'

const iglesias = ref([])
const selectedId = ref('')
const loading = ref(true)
const saving = ref(false)
const creating = ref(false)
const feedback = ref('')
const errorMessage = ref('')

const editForm = reactive({
  name: '',
  address: '',
})

const createForm = reactive({
  name: '',
  address: '',
})

let unsubscribe = null

const selectedChurch = computed(() =>
  iglesias.value.find((iglesia) => iglesia.id === selectedId.value) ?? null,
)

function fillEditForm(iglesia) {
  editForm.name = iglesia?.name ?? ''
  editForm.address = iglesia?.address ?? ''
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
}

async function saveChurch() {
  if (!selectedChurch.value) {
    errorMessage.value = 'Selecciona una iglesia antes de guardar cambios.'
    return
  }

  const name = editForm.name.trim()
  const address = editForm.address.trim()

  if (!name || !address) {
    errorMessage.value = 'Name y address son obligatorios.'
    return
  }

  saving.value = true
  errorMessage.value = ''
  feedback.value = ''

  try {
    await updateDoc(doc(db, 'iglesias', selectedChurch.value.id), {
      name,
      address,
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
  const name = createForm.name.trim()
  const address = createForm.address.trim()

  if (!name || !address) {
    errorMessage.value = 'Completa name y address para crear una iglesia.'
    return
  }

  creating.value = true
  errorMessage.value = ''
  feedback.value = ''

  try {
    await addDoc(collection(db, 'iglesias'), {
      name,
      address,
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

onMounted(() => {
  if (!hasFirebaseConfig) {
    loading.value = false
    errorMessage.value = 'Falta configurar Firebase en el archivo .env.local.'
    return
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
})
</script>

<template>
  <main class="layout">
    <section class="hero-panel">
      <p class="eyebrow">Directorio vivo</p>
      <h1>Iglesias del Callao</h1>
      <p class="lead">
        Edita <strong>name</strong> y <strong>address</strong> desde la app y los cambios se
        guardan en la colección <strong>iglesias</strong> de Firestore.
      </p>

      <div class="hero-notes">
        <article>
          <span class="note-label">Colección</span>
          <strong>iglesias</strong>
        </article>
        <article>
          <span class="note-label">Campos editables</span>
          <strong>name, address</strong>
        </article>
        <article>
          <span class="note-label">Sincronización</span>
          <strong>Firestore en tiempo real</strong>
        </article>
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
            <button
              class="church-card"
              :class="{ active: iglesia.id === selectedId }"
              type="button"
              @click="selectChurch(iglesia)"
            >
              <strong>{{ iglesia.name || 'Sin nombre' }}</strong>
              <span>{{ iglesia.address || 'Sin dirección' }}</span>
            </button>
          </li>
        </ul>

        <p v-else class="status empty-state">
          No hay documentos en <strong>iglesias</strong>. Usa el formulario para crear el primero.
        </p>
      </aside>

      <section class="panel editor-panel">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Edición</p>
            <h2>Actualizar iglesia</h2>
          </div>
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

          <button class="primary-button" type="submit" :disabled="saving || !selectedChurch">
            {{ saving ? 'Guardando...' : 'Guardar en Firestore' }}
          </button>
        </form>
      </section>

      <section class="panel create-panel">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Alta</p>
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

          <button class="secondary-button" type="submit" :disabled="creating">
            {{ creating ? 'Creando...' : 'Crear documento' }}
          </button>
        </form>
      </section>
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

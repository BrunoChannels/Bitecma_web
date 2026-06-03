import { useMemo, useRef, useState } from 'react'
import { usarAplicacion } from '../context/appContext.jsx'
import { usarInterfaz } from '../context/uiContext.jsx'

/**
 * Página de perfil: edición de datos personales y cambio de contraseña.
 *
 * @param {object} props - Props del componente.
 * @param {boolean} props.activo - Indica si la página está activa (se usa para estilos).
 * @returns {import('react').JSX.Element} UI de perfil con avatar, formulario y sección de contraseña.
 *
 * Lógica (alto nivel):
 * 1) Lee `user` y acciones (`updateProfile`, `changePassword`, `navigate`) desde el contexto de app.
 * 2) Construye `baseForm` desde el usuario y guarda ediciones locales por usuario (`editsByUser`).
 * 3) Permite:
 *    - Cambiar avatar (cargando imagen local como DataURL).
 *    - Editar nombre/correo/teléfono.
 *    - Guardar cambios (con validación básica de email/nombre).
 *    - Abrir sección de cambio de contraseña y ejecutar `changePassword`.
 *
 * Dependencias externas:
 * - `useApp`: `user`, `navigate`, `updateProfile`, `changePassword`.
 * - `useUi`: `toast`.
 * - API Web: `FileReader` para cargar imagen de avatar.
 *
 * Efectos secundarios:
 * - Puede navegar al dashboard.
 * - Puede actualizar perfil y/o contraseña (según implementación en contexto).
 * - Lee archivos locales (avatar) y los almacena como DataURL en estado.
 *
 * Manejo de errores:
 * - Valida email y nombre antes de guardar.
 * - La validación/errores finales se delegan al contexto (`updateProfile`/`changePassword`).
 *
 * @example
 * <PerfilPage activo={page === 'perfil'} />
 *
 * Notas de mantenimiento:
 * - Guardar avatar como DataURL puede aumentar el tamaño del estado/localStorage; considerar upload a backend si se requiere.
 * - Mantener `editsByUser` para soportar cambios de usuario sin mezclar formularios.
 */
export default function PerfilPage({ activo }) {
  const { usuario: user, navegar: navigate, actualizarPerfil: updateProfile, subirAvatar: uploadAvatar, cambiarContrasena: changePassword } = usarAplicacion()
  const { mostrarToast: toast } = usarInterfaz()
  const fileRef = useRef(null)

  const apiUrl = String(import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '')
  const apiEnabled = !!apiUrl

  const userKey = user ? String(user.id) : '__anon__'
  const baseForm = useMemo(
    () => ({
      nombre: user?.nombre || '',
      correo: user?.correo || '',
      numero: user?.numero || '',
      avatar_url: user?.avatar_url || '',
      logo: user?.logo || '',
    }),
    [user?.nombre, user?.correo, user?.numero, user?.avatar_url, user?.logo],
  )
  const [editsByUser, setEditsByUser] = useState(() => ({}))
  const edits = editsByUser?.[userKey] || {}
  const form = { ...baseForm, ...edits }

  /**
   * Actualiza un campo del formulario de perfil en el buffer local de ediciones.
   *
   * @param {'nombre'|'correo'|'numero'|'logo'|string} key - Campo a modificar.
   * @param {any} value - Valor nuevo del campo.
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Toma el objeto actual de ediciones del usuario (`editsByUser[userKey]`).
   * 2) Escribe el campo indicado preservando el resto.
   * 3) Mantiene ediciones separadas por usuario (`userKey`).
   *
   * Dependencias externas:
   * - `setEditsByUser` (estado local) y `userKey`.
   *
   * Efectos secundarios:
   * - Actualiza estado local (re-render).
   *
   * Manejo de errores:
   * - No aplica.
   *
   * @example
   * setField('correo', 'ana@empresa.cl')
   *
   * Notas de mantenimiento:
   * - Si se agregan nuevos campos al perfil, permitirlos aquí y en `baseForm`.
   */
  const setField = (key, value) => {
    setEditsByUser((prev) => {
      const cur = prev?.[userKey] || {}
      return { ...(prev || {}), [userKey]: { ...cur, [key]: value } }
    })
  }
  const [pwd, setPwd] = useState({ oldPass: '', newPass: '', confirmPass: '' })
  const [showPwd, setShowPwd] = useState(false)

  const initials = useMemo(() => {
    const parts = String(form.nombre || user?.nombre || 'US')
      .split(/\s+/)
      .filter(Boolean)
    const a = parts[0]?.[0] || 'U'
    const b = parts[1]?.[0] || 'S'
    return String(a + b).toUpperCase()
  }, [form.nombre, user?.nombre])

  const dirty =
    String(form.nombre || '') !== String(baseForm.nombre || '') ||
    String(form.correo || '') !== String(baseForm.correo || '') ||
    String(form.numero || '') !== String(baseForm.numero || '') ||
    String(form.avatar_url || '') !== String(baseForm.avatar_url || '') ||
    String(form.logo || '') !== String(baseForm.logo || '')

  return (
    <div className={`page${activo ? ' active' : ''}`} id="pg-perfil">
      <div className="ph">
        <div>
          <h2>Perfil</h2>
          <p>Actualiza tus datos de contacto</p>
        </div>
        <div className="ph-a">
          <button className="btn b-out" onClick={() => navigate('dashboard')}>
            Volver
          </button>
        </div>
      </div>

      <div className="profile-card card">
        <div className="profile-grid">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e?.target?.files?.[0]
                if (!file) return

                if (apiEnabled && uploadAvatar) {
                  const rel = await uploadAvatar(file)
                  if (rel) {
                    setField('avatar_url', String(rel))
                    setField('logo', '')
                  }
                  return
                }

                const fr = new FileReader()
                fr.onload = () => setField('logo', String(fr.result || ''))
                fr.readAsDataURL(file)
              }}
            />

            {(() => {
              const raw = String(form.avatar_url || form.logo || '').trim()
              const src =
                raw && (raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('blob:'))
                  ? raw
                  : raw && raw.startsWith('/')
                    ? `${apiUrl}${raw}`
                    : raw && apiUrl
                      ? `${apiUrl}/${raw.replace(/^\/+/, '')}`
                      : ''
              const has = !!src

              return (
                <div
                  className="pf-avatar"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    backgroundImage: has ? `url('${src}')` : '',
                    backgroundSize: has ? 'cover' : '',
                    backgroundPosition: has ? 'center' : '',
                  }}
                >
                  <div className="pf-initials" style={{ opacity: has ? 0 : 1 }}>
                    {initials}
                  </div>
                  <div className="pf-avatar-hint">Cambiar</div>
                </div>
              )
            })()}
          </div>

          <div>
            <div className="ig">
              <label className="il">Nombre completo</label>
              <input
                className="ii"
                placeholder="Nombre Apellido"
                value={form.nombre}
                onChange={(e) => setField('nombre', e.target.value)}
              />
            </div>
            <div className="ig">
              <label className="il">Correo electrónico</label>
              <input
                className="ii"
                type="email"
                placeholder="correo@dominio.cl"
                value={form.correo}
                onChange={(e) => setField('correo', e.target.value)}
              />
            </div>
            <div className="ig">
              <label className="il">Número de teléfono</label>
              <input
                className="ii"
                placeholder="+56 9 ..."
                value={form.numero}
                onChange={(e) => setField('numero', e.target.value)}
              />
            </div>

            <div className="pf-actions">
              <button
                className="btn b-out"
                onClick={() => {
                  setPwd({ oldPass: '', newPass: '', confirmPass: '' })
                  setShowPwd((v) => !v)
                }}
              >
                Modificar contraseña
              </button>
              <button
                className="btn b-teal"
                onClick={async () => {
                  if (form.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
                    toast('Correo inválido', 'red')
                    return
                  }
                  if (!String(form.nombre || '').trim()) {
                    toast('Ingresa nombre completo', 'red')
                    return
                  }
                  await updateProfile(form)
                }}
                disabled={!dirty}
              >
                Guardar cambios
              </button>
            </div>

            {showPwd ? (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div className="ig">
                  <label className="il">Contraseña actual</label>
                  <input
                    className="ii"
                    type="password"
                    value={pwd.oldPass}
                    onChange={(e) => setPwd((s) => ({ ...s, oldPass: e.target.value }))}
                  />
                </div>
                <div className="ig">
                  <label className="il">Nueva contraseña</label>
                  <input
                    className="ii"
                    type="password"
                    value={pwd.newPass}
                    onChange={(e) => setPwd((s) => ({ ...s, newPass: e.target.value }))}
                  />
                </div>
                <div className="ig">
                  <label className="il">Confirmar nueva contraseña</label>
                  <input
                    className="ii"
                    type="password"
                    value={pwd.confirmPass}
                    onChange={(e) => setPwd((s) => ({ ...s, confirmPass: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn b-out" style={{ flex: 1 }} onClick={() => setShowPwd(false)}>
                    Cancelar
                  </button>
                  <button
                    className="btn b-teal"
                    style={{ flex: 1 }}
                    onClick={() => {
                      const ok = changePassword(pwd)
                      if (ok) setShowPwd(false)
                    }}
                  >
                    Guardar nueva contraseña
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

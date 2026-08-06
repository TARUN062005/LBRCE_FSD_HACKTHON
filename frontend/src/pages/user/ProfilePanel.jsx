import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axios'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const MAX_EDGE = 512
const JPEG_QUALITY = 0.72

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('Choose an image file'))
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Image must be under 8 MB'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Invalid image'))
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function ProfilePanel() {
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const fileRef = useRef(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [dirtyPhoto, setDirtyPhoto] = useState(false)

  useEffect(() => {
    if (!user) return
    setName(user.name || '')
    setPhone(user.phone || '')
    setVehicleNumber(user.vehicleNumber || '')
    setPreview(user.picture || '')
    setDirtyPhoto(false)
  }, [user])

  if (!user) return null

  const complete = Boolean(user.profileComplete)
  const missing = []
  if (!user.phone) missing.push('phone')
  if (!user.vehicleNumber) missing.push('vehicle number')

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const body = { name, phone, vehicleNumber }
      if (dirtyPhoto) body.picture = preview || ''
      const { data } = await api.patch('/auth/profile', body)
      updateUser(data.user)
      setDirtyPhoto(false)
      toast('Profile updated')
    } catch (err) {
      toast(err.response?.data?.message || 'Could not save profile', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onPickPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUrl = await compressImageFile(file)
      setPreview(dataUrl)
      setDirtyPhoto(true)
      toast('Photo ready — tap Save to apply')
    } catch (err) {
      toast(err.message || 'Photo failed', 'error')
    }
  }

  async function removePhoto() {
    setBusy(true)
    try {
      const { data } = await api.delete('/auth/profile/photo')
      updateUser(data.user)
      setPreview(data.user.picture || '')
      setDirtyPhoto(false)
      toast('Custom photo removed')
    } catch (err) {
      toast(err.response?.data?.message || 'Could not remove photo', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function clearIncomplete() {
    setBusy(true)
    try {
      const { data } = await api.post('/auth/profile/reset-incomplete')
      updateUser(data.user)
      setName(data.user.name || '')
      setPhone(data.user.phone || '')
      setVehicleNumber(data.user.vehicleNumber || '')
      setPreview(data.user.picture || '')
      setDirtyPhoto(false)
      toast(data.message || 'Incomplete details cleared')
    } catch (err) {
      toast(err.response?.data?.message || 'Could not clear profile', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="page-title">Your profile</h2>
        <p className="page-desc">
          Keep your EV details up to date so hosts know who is arriving.
        </p>
      </div>

      {!complete && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-semibold">Finish your profile</p>
          <p className="mt-0.5 text-amber-900/80 dark:text-amber-100/80">
            Add your {missing.join(' and ')} to complete booking check-in details.
          </p>
        </div>
      )}

      <form onSubmit={save} className="ui-card overflow-hidden">
        <div className="relative bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-800 px-5 pb-14 pt-8 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            GridFleet driver
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight">{user.name}</p>
          <p className="mt-1 text-sm text-white/80">{user.email}</p>
        </div>

        <div className="-mt-10 flex flex-col items-center px-5 sm:flex-row sm:items-end sm:gap-5">
          <div className="relative">
            {preview ? (
              <img
                src={preview}
                alt=""
                className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-lg dark:border-surface-dark"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-accent/15 font-display text-3xl font-bold text-accent shadow-lg dark:border-surface-dark">
                {(name || '?')[0]}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow"
            >
              Edit
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickPhoto}
            />
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:mt-0 sm:justify-start">
            <button
              type="button"
              className="ui-btn ui-btn-secondary !py-1.5 text-xs"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              Change photo
            </button>
            {(user.customPicture || dirtyPhoto) && (
              <button
                type="button"
                className="ui-btn ui-btn-secondary !py-1.5 text-xs"
                onClick={removePhoto}
                disabled={busy}
              >
                Remove photo
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4 px-5 pb-5 pt-6">
          <label className="block text-sm">
            <span className="ui-label">Full name</span>
            <input
              className="ui-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
            />
          </label>

          <label className="block text-sm">
            <span className="ui-label">Email</span>
            <input className="ui-input opacity-80" value={user.email} disabled readOnly />
            <span className="mt-1 block text-xs text-ink-muted">
              Signed in with Google — email cannot be changed here.
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="ui-label">Phone number</span>
              <input
                className="ui-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
            <label className="block text-sm">
              <span className="ui-label">Vehicle number</span>
              <input
                className="ui-input uppercase"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="AP 16 AB 1234"
                autoComplete="off"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 dark:border-border-dark">
            <button type="submit" className="ui-btn ui-btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save profile'}
            </button>
            <Link to="/user/map" className="ui-btn ui-btn-secondary">
              Find chargers
            </Link>
            {!complete && (
              <button
                type="button"
                className="ml-auto text-xs font-semibold text-danger hover:underline"
                disabled={busy}
                onClick={clearIncomplete}
              >
                Clear incomplete details
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="ui-card grid gap-3 p-5 text-sm sm:grid-cols-3">
        <Meta label="Account" value="Google" />
        <Meta label="Role" value="EV owner" />
        <Meta label="Status" value={complete ? 'Complete' : 'Needs details'} />
      </div>
    </section>
  )
}

function Meta({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-0.5 font-semibold text-ink dark:text-white">{value}</p>
    </div>
  )
}

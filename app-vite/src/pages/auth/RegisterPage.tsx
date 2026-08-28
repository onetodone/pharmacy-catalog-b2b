import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Pill } from 'lucide-react'
import { api, apiError } from '@/lib/api'
import { homePathFor, useAuth } from '@/context/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const FIELDS: Array<{
  name: keyof FormState
  label: string
  type?: string
  hint?: string
}> = [
  { name: 'login', label: 'Login', hint: '3-20 chars, letters/digits/-/_' },
  { name: 'password', label: 'Password', type: 'password', hint: '8-32 chars' },
  { name: 'name', label: 'Pharmacy / company name' },
  { name: 'managerName', label: 'Manager name' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone' },
  { name: 'taxId', label: 'Tax ID' },
  { name: 'address', label: 'Address' },
]

type FormState = {
  login: string
  password: string
  name: string
  managerName: string
  email: string
  phone: string
  taxId: string
  address: string
}

const EMPTY: FormState = {
  login: '',
  password: '',
  name: '',
  managerName: '',
  email: '',
  phone: '',
  taxId: '',
  address: '',
}

export function RegisterPage() {
  const { user } = useAuth()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={homePathFor(user.role)} replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.post('/auth/register', form)
      setDone(true)
    } catch (err) {
      setError(apiError(err, 'Registration failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="items-center text-center">
          <Pill className="h-8 w-8 text-primary" />
          <CardTitle>Create a customer account</CardTitle>
          <CardDescription>
            An administrator approves new accounts before first sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4 text-center">
              <p className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-800">
                Thanks! Your registration was received and is pending approval.
                You will be able to sign in once an administrator activates your
                account.
              </p>
              <Button asChild variant="outline">
                <Link to="/login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {FIELDS.map((f) => (
                <div key={f.name} className="space-y-1.5">
                  <Label htmlFor={f.name}>{f.label}</Label>
                  <Input
                    id={f.name}
                    type={f.type ?? 'text'}
                    value={form[f.name]}
                    onChange={(e) =>
                      setForm({ ...form, [f.name]: e.target.value })
                    }
                    required
                  />
                  {f.hint && (
                    <p className="text-xs text-muted-foreground">{f.hint}</p>
                  )}
                </div>
              ))}
              {error && (
                <p className="text-sm text-destructive sm:col-span-2">
                  {error}
                </p>
              )}
              <div className="flex items-center gap-3 sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Submitting…' : 'Register'}
                </Button>
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:underline"
                >
                  Already have an account?
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

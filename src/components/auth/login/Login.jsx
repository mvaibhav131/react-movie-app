import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { HiMail, HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi'
import { loginSuccess, getUsers, saveUsers } from '../../../store/authSlice'
import { constantTimeEqual, generateSalt, hashPassword } from '../../../utils/passwords'
import useDocumentTitle from '../../../hooks/useDocumentTitle'
import '../style.scss'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  useDocumentTitle('Sign in')

  const verify = async (user, candidate) => {
    if (user.passwordHash && user.salt) {
      return constantTimeEqual(await hashPassword(candidate, user.salt), user.passwordHash)
    }
    // Accounts created before passwords were hashed: check once, then upgrade the stored record.
    if (typeof user.password === 'string' && constantTimeEqual(user.password, candidate)) {
      const salt = generateSalt()
      const upgraded = { ...user, salt, passwordHash: await hashPassword(candidate, salt) }
      delete upgraded.password
      saveUsers(getUsers().map((u) => (u.id === user.id ? upgraded : u)))
      return true
    }
    return false
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const found = getUsers().find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
      if (!found || !(await verify(found, password))) {
        setError('Invalid email or password.')
        return
      }
      const { id, name, email: userEmail, createdAt } = found
      dispatch(loginSuccess({ id, name, email: userEmail, createdAt }))
      toast.success(`Welcome back, ${name}!`)
      navigate(location.state?.from || '/', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="authHeader">
          <h1>Welcome back</h1>
          <p>Sign in to sync your list and continue watching.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Email address</span>
            <div className="inputGroup">
              <HiMail className="inputIcon" aria-hidden="true" />
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={!!error} />
            </div>
          </label>

          <label className="field">
            <span>Password</span>
            <div className="inputGroup">
              <HiLockClosed className="inputIcon" aria-hidden="true" />
              <input type={showPass ? 'text' : 'password'} placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" aria-invalid={!!error} />
              <button type="button" className="eyeBtn" aria-label={showPass ? 'Hide password' : 'Show password'} onClick={() => setShowPass((p) => !p)}>
                {showPass ? <HiEyeOff /> : <HiEye />}
              </button>
            </div>
          </label>

          {error && (
            <p className="formError" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn--primary btn--lg btn--block submitBtn" disabled={loading}>
            {loading ? <span className="btnSpinner" aria-hidden="true" /> : 'Sign in'}
            {loading && <span className="srOnly">Signing in</span>}
          </button>
        </form>

        <div className="authFooter">
          <p>
            New to VM Flix? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login

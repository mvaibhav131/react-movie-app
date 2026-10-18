import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { HiUser, HiMail, HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi'
import { getUsers, saveUsers } from '../../../store/authSlice'
import { generateSalt, hashPassword } from '../../../utils/passwords'
import useDocumentTitle from '../../../hooks/useDocumentTitle'
import '../style.scss'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  useDocumentTitle('Create account')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!name.trim() || !email.trim() || !password) return setError('Please fill in all fields.')
    if (!EMAIL.test(email.trim())) return setError('Enter a valid email address.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')

    setLoading(true)
    setError('')
    try {
      const users = getUsers()
      if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
        setError('An account with this email already exists.')
        return
      }
      const salt = generateSalt()
      saveUsers([
        ...users,
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          salt,
          passwordHash: await hashPassword(password, salt),
          createdAt: new Date().toISOString(),
        },
      ])
      toast.success('Account created. Please sign in.')
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="authHeader">
          <h1>Create account</h1>
          <p>Save titles to My List and pick up where you left off.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Full name</span>
            <div className="inputGroup">
              <HiUser className="inputIcon" aria-hidden="true" />
              <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
          </label>

          <label className="field">
            <span>Email address</span>
            <div className="inputGroup">
              <HiMail className="inputIcon" aria-hidden="true" />
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
          </label>

          <label className="field">
            <span>Password</span>
            <div className="inputGroup">
              <HiLockClosed className="inputIcon" aria-hidden="true" />
              <input type={showPass ? 'text' : 'password'} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
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
            {loading ? <span className="btnSpinner" aria-hidden="true" /> : 'Create account'}
            {loading && <span className="srOnly">Creating account</span>}
          </button>
        </form>

        <div className="authFooter">
          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register

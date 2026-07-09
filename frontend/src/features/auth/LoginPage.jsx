import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { loginUser } from '../../api/auth.api'
import { toast } from 'sonner'
import { useState } from 'react'

const Logo = ({ size = 52 }) => (
  <svg width={size} height={Math.round(size * 0.72)} viewBox="0 0 186 133" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M74.5079 64.1778L63.9134 84.1374V104.174H80.826V83.1778L88.1843 70.7414L74.5079 64.1778Z" fill="white" fillOpacity=".7"/>
    <path d="M33.8637 34.5838L39.9507 21.303L53.3575 27.0606L47.5787 40.8788L33.8637 34.5838Z" fill="white"/>
    <path d="M43.2254 6.90909L54.4747 0L64.3372 16.0061L53.3575 23.0303L43.2254 6.90909Z" fill="white" fillOpacity=".85"/>
    <path d="M54.5903 40.8788L60.4847 27.7131L74.1226 33.6626L68.1897 47.2505L54.5903 40.8788Z" fill="white"/>
    <path d="M83.0605 36.2727L94.3869 29.4788L84.2933 13.396L73.198 20.4202L83.0605 36.2727Z" fill="white" fillOpacity=".85"/>
    <path d="M94.3869 38.7293L100.397 25.2566L113.534 31.0525L107.948 44.5636L94.3869 38.7293Z" fill="white"/>
    <path d="M111.377 25.2566L117.155 11.5152L130.755 17.4646L124.86 31.0525L111.377 25.2566Z" fill="white"/>
    <path d="M102.862 47.6727L117.309 49.3616L115.807 64.1778L100.782 62.4505L102.862 47.6727Z" fill="white"/>
    <path d="M77.3973 59.2646L90.0336 65.9818L98.9714 49.5535L86.181 42.7596L77.3973 59.2646Z" fill="white" fillOpacity=".7"/>
    <path d="M43.6106 50.0141H63.9134L69.7693 62.1434L60.9855 78.8404L43.6106 50.0141Z" fill="white" fillOpacity=".7"/>
    <path d="M5.23944 20.8424L19.2626 26.9455L13.5994 40.2263L0 34.3151L5.23944 20.8424Z" fill="white"/>
    <path d="M16.065 43.6424L23.8471 33.1636L39.0646 44.2949L31.321 54.9273L16.065 43.6424Z" fill="white" fillOpacity=".85"/>
    <path d="M16.8741 22.4545L23.1922 8.86667L36.522 14.7778L30.7432 28.4424L16.8741 22.4545Z" fill="white"/>
  </svg>
)

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  const onSubmit = async (data) => {
    try {
      const res = await loginUser(data)
      login(res.token, res.user)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left: Brand panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[46%] px-14 py-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #F89A20 0%, #f07020 50%, #EE2726 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10" />
        <div className="absolute bottom-12 -left-20 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute top-1/2 right-8 w-32 h-32 rounded-full bg-white/5" />

        {/* Top: logo + school name */}
        <div className="relative flex items-center gap-4">
          <Logo size={56} />
          <div>
            <p className="text-white font-bold text-lg tracking-widest leading-none">YENEPOYA</p>
            <p className="text-white/70 text-[11px] tracking-widest uppercase mt-1">International School</p>
          </div>
        </div>

        {/* Center: headline */}
        <div className="relative">
          <div className="w-12 h-0.5 bg-white/50 mb-8" />
          <h1 className="text-white text-[2.6rem] font-bold leading-tight mb-5">
            Lesson<br />Management<br />System
          </h1>
          <p className="text-white/75 text-sm leading-relaxed max-w-xs">
            Plan, track, and approve weekly lesson plans across all grades and subjects in one place.
          </p>
          <div className="mt-10 space-y-3.5">
            {[
              'Submit and review lesson plans weekly',
              'Curriculum coverage tracking',
              'HOD approval workflow',
              'Compliance and pacing reports',
            ].map(text => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                <p className="text-white/75 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: copyright */}
        <p className="relative text-white/40 text-xs">
          © {new Date().getFullYear()} Yenepoya International School
        </p>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <svg width="40" height="29" viewBox="0 0 186 133" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M74.5079 64.1778L63.9134 84.1374V104.174H80.826V83.1778L88.1843 70.7414L74.5079 64.1778Z" fill="#676767"/>
              <path d="M33.8637 34.5838L39.9507 21.303L53.3575 27.0606L47.5787 40.8788L33.8637 34.5838Z" fill="#F89A20"/>
              <path d="M43.2254 6.90909L54.4747 0L64.3372 16.0061L53.3575 23.0303L43.2254 6.90909Z" fill="#EE2726"/>
              <path d="M54.5903 40.8788L60.4847 27.7131L74.1226 33.6626L68.1897 47.2505L54.5903 40.8788Z" fill="#F89A20"/>
              <path d="M83.0605 36.2727L94.3869 29.4788L84.2933 13.396L73.198 20.4202L83.0605 36.2727Z" fill="#EE2726"/>
              <path d="M94.3869 38.7293L100.397 25.2566L113.534 31.0525L107.948 44.5636L94.3869 38.7293Z" fill="#F89A20"/>
              <path d="M111.377 25.2566L117.155 11.5152L130.755 17.4646L124.86 31.0525L111.377 25.2566Z" fill="#F89A20"/>
              <path d="M102.862 47.6727L117.309 49.3616L115.807 64.1778L100.782 62.4505L102.862 47.6727Z" fill="#F89A20"/>
              <path d="M77.3973 59.2646L90.0336 65.9818L98.9714 49.5535L86.181 42.7596L77.3973 59.2646Z" fill="#676767"/>
              <path d="M43.6106 50.0141H63.9134L69.7693 62.1434L60.9855 78.8404L43.6106 50.0141Z" fill="#676767"/>
              <path d="M5.23944 20.8424L19.2626 26.9455L13.5994 40.2263L0 34.3151L5.23944 20.8424Z" fill="#F89A20"/>
              <path d="M16.065 43.6424L23.8471 33.1636L39.0646 44.2949L31.321 54.9273L16.065 43.6424Z" fill="#EE2726"/>
              <path d="M16.8741 22.4545L23.1922 8.86667L36.522 14.7778L30.7432 28.4424L16.8741 22.4545Z" fill="#F89A20"/>
            </svg>
            <div>
              <p className="font-bold text-neutral-900 text-sm leading-none">YENEPOYA</p>
              <p className="text-[10px] text-neutral-400 tracking-widest uppercase mt-0.5">International School · LMS</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900">Welcome back</h2>
            <p className="text-sm text-neutral-500 mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email address</label>
              <input
                type="email"
                placeholder="you@school.edu"
                autoComplete="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' },
                })}
              />
              {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  onClick={() => setShowPass(v => !v)}
                >
                  {showPass ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-2.5 text-sm font-semibold mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-neutral-400 mt-8">
            Contact your administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  )
}

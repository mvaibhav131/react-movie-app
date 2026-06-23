import React, { useState } from 'react';
import './style.scss';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { loginSuccess, getUsers } from '../../../store/authSlice';
import { HiMail, HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            toast.error('Please fill in all fields.');
            return;
        }
        setLoading(true);

        setTimeout(() => {
            const users = getUsers();
            const found = users.find(
                (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
            );
            if (!found) {
                toast.error('Invalid email or password.');
                setLoading(false);
                return;
            }
            const { password: _, ...safeUser } = found;
            dispatch(loginSuccess(safeUser));
            toast.success(`Welcome back, ${safeUser.name}! 🎬`);
            navigate('/');
            setLoading(false);
        }, 600);
    };

    return (
        <div className="authPage">
            <div className="authCard">
                <div className="authHeader">
                    <div className="authLogo">🎬</div>
                    <h1>Welcome Back</h1>
                    <p>Sign in to continue watching</p>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="inputGroup">
                        <HiMail className="inputIcon" />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                    </div>

                    <div className="inputGroup">
                        <HiLockClosed className="inputIcon" />
                        <input
                            type={showPass ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            className="eyeBtn"
                            onClick={() => setShowPass((p) => !p)}
                        >
                            {showPass ? <HiEyeOff /> : <HiEye />}
                        </button>
                    </div>

                    <button type="submit" className="submitBtn" disabled={loading}>
                        {loading ? <span className="btnSpinner" /> : 'Sign In'}
                    </button>
                </form>

                <div className="authFooter">
                    <p>
                        Don't have an account?{' '}
                        <Link to="/register">Create one</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;

import React, { useState } from 'react';
import '../login/style.scss';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getUsers, saveUsers } from '../../../store/authSlice';
import { HiUser, HiMail, HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !password.trim()) {
            toast.error('Please fill in all fields.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error('Enter a valid email address.');
            return;
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);

        setTimeout(() => {
            const users = getUsers();
            const exists = users.some(
                (u) => u.email.toLowerCase() === email.toLowerCase()
            );
            if (exists) {
                toast.error('An account with this email already exists.');
                setLoading(false);
                return;
            }
            const newUser = {
                id: Date.now().toString(),
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password,
                createdAt: new Date().toISOString(),
            };
            saveUsers([...users, newUser]);
            toast.success('Account created! Please sign in. 🎉');
            navigate('/login');
            setLoading(false);
        }, 600);
    };

    return (
        <div className="authPage">
            <div className="authCard">
                <div className="authHeader">
                    <div className="authLogo">🎬</div>
                    <h1>Create Account</h1>
                    <p>Join and start watching today</p>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="inputGroup">
                        <HiUser className="inputIcon" />
                        <input
                            type="text"
                            placeholder="Full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                        />
                    </div>

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
                            placeholder="Password (min. 6 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
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
                        {loading ? <span className="btnSpinner" /> : 'Create Account'}
                    </button>
                </form>

                <div className="authFooter">
                    <p>
                        Already have an account?{' '}
                        <Link to="/login">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;

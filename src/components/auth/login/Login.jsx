import React, { useState } from 'react';
import './style.scss';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
    const [login, setLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleToggle = () => {
        setLogin(!login);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Perform login or registration logic here
        console.log(`Email: ${email}, Password: ${password}`);
        // Reset form fields
        setEmail('');
        setPassword('');
    };

    return (
        <div className="App">
            <div className="container">
                <div className="form-container">
                    <h1>
                        {/* {login ? 'Login' : 'Register'} */}
                        Login
                    </h1>
                    <form onSubmit={handleSubmit}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type="submit" onClick={() => {email.length>=1&&password.length>=1 ? navigate("/"):""}} >
                            {/* {login ? 'Login' : 'Register'} */}
                            Login
                        </button>
                    </form>
                    <div className="toggle-container">
                        <p>
                            {/* {login ? "Don't have an account?" : 'Already have an account?'} */}
                            Don't have an account?
                            <Link className="toggle-link" onClick={handleToggle} to={"/register"}>
                                {/* {login ? 'Register here' : 'Login here'} */}
                                Register here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

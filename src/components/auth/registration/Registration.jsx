import React, { useState } from 'react';
import './style.scss';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
    const [login, setLogin] = useState(true);
    const [name, setName] = useState('');
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
                        Register
                    </h1>
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            placeholder="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
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
                        <button type="submit" onClick={() => { name.length>=1 && email.length >=1 && password.length >=1 ? navigate("/login") : "" }}>
                            {/* {login ? 'Login' : 'Register'} */}
                            Register
                        </button>
                    </form>
                    <div className="toggle-container">
                        <p>
                            {/* {login ? "Don't have an account?" : 'Already have an account?'} */}
                            Already have an account?
                            <Link className="toggle-link" onClick={handleToggle} to={"/login"}>
                                {/* {login ? 'Register here' : 'Login here'} */}
                                Login here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;

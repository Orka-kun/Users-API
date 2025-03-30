import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/register`, { name, email, password });
      setMessage('Registration successful. Please log in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Server error');
    }
  };
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create an account here
        </h2>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        {message && <p className="text-green-500 mb-4 text-center">{message}</p>}
    </div>
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form onSubmit={handleSubmit} className="space-y-6" >
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black text-left">
                  Full Name
              </label>
              <div className="mt-1">
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm" placeholder="Enter your email address"/>
              </div>
            </div>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-black text-left">Email address</label>
                <div className="mt-1">
                    <input value={email} onChange={(e) => setEmail(e.target.value)} id="email" name="email" type="email" required className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm" placeholder="Enter your email address"/>
                </div>
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-black text-left">
                    Password
                </label>
                <div className="mt-1">
                    <input value={password} onChange={(e) => setPassword(e.target.value)} id="password" name="password" type="password" autoComplete="current-password" required
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm" placeholder="Enter your password"/>
                </div>
            </div>
            <div>
                <button type="submit"
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-pink-700">Sign Up
                </button>
            </div>
            <div className="flex items-center justify-between">
                <div className="text-sm mx-auto">
                    <a href="/login" className="font-medium text-black hover:text-pink-700">
                    Already have an account? Sign in 
                    </a>
                </div>
            </div>  
            </form>
        </div>
    </div>
</div>
   
  );
};
export default Register;

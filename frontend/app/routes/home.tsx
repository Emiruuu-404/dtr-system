import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Welcome } from '../welcome/welcome';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
    }
  }, []);

  return <Welcome />;
}

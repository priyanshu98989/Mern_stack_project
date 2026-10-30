import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import Card from '../components/ui/Card';

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto mt-20 text-center">
      <Card>
        <p className="text-6xl font-bold text-brand-600">404</p>
        <p className="mt-2 text-gray-500">Page not found.</p>
        <Link to="/dashboard" className="btn-primary mt-4 inline-flex">
          <Home className="w-4 h-4" /> Go home
        </Link>
      </Card>
    </div>
  );
}

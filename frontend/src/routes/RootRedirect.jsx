import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authContext';


const RootRedirect = () => {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Auto-redirect to their specific dashboard if they land on "/"
    const rolePaths = {
        Farmer: '/farmer',
        Agri: '/agri',
        Opv: '/opv',
        Inspector: '/inspector',
    };

    return <Navigate to={rolePaths[user.role] || '/login'} replace />;
};

export default RootRedirect
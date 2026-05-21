import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authContext';


const RootRedirect = ({ children }) => {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return children;
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
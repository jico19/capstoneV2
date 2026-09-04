import LandingNavbar from '../../components/ui/LandingNavbar';
import LandingFooter from '../../components/ui/LandingFooter';
import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";

const LandingLayout = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <div className="flex flex-col min-h-screen">
            <LandingNavbar />
            <main className="flex-1">
                <Outlet />
            </main>
            <LandingFooter />
        </div>
    );
};

export default LandingLayout;
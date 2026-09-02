import LandingNavbar from '../../components/ui/LandingNavbar'
import { Outlet } from "react-router-dom"



const LandingLayout = ({ children }) => {
    return (
        <LandingNavbar>
            <Outlet />
        </LandingNavbar>
    )
}

export default LandingLayout
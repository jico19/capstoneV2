import LandingNavbar from "/src/components/ui/LandingNavbar"
import { Outlet } from "react-router-dom"



const LandingLayout = ({ children }) => {
    return (
        <LandingNavbar>
            <Outlet />
        </LandingNavbar>
    )
}

export default LandingLayout
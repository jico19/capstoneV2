import ConnectionNotice from './components/ui/ConnectionNotice';
import { RouterProvider } from "react-router-dom"
import router from "./routes"

function App() {


  return (
    <>
      <ConnectionNotice />
      <RouterProvider router={router}>
      </RouterProvider>
    </>
  )
}

export default App

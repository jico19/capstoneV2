import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import useAuthStore from "/src/store/authContext"

const LoginPage = () => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
    const login = useAuthStore((s) => s.login)
    const navigate = useNavigate()

    const onSubmit = async (data) => {
        await login(data)
        navigate('/')
    }

    return (
        <div>
            <form onSubmit={handleSubmit(onSubmit)}>
                <input
                    type="text"
                    {...register('username', { required: "Username is required." })}
                    className="input"
                />
                <input
                    type="password"
                    {...register('password', { required: "password is required." })}
                    className="input"
                />
                <button type="submit">
                    {isSubmitting ? "Logging in..." : "Log in"}
                </button>
            </form>
        </div>
    )
}

export default LoginPage
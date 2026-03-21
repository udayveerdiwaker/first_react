import { Link } from "react-router-dom";

function Register() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-xl w-80 text-white">
        <h2 className="text-2xl mb-4">Register</h2>

        <input
          className="w-full p-2 mb-3 rounded bg-gray-700"
          placeholder="Email"
        />
        <input
          className="w-full p-2 mb-3 rounded bg-gray-700"
          placeholder="Password"
        />

        <button className="w-full bg-green-500 p-2 rounded">Register</button>

        <p className="mt-3 text-sm">
          Already have account?{" "}
          <Link to="/" className="text-blue-400">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;

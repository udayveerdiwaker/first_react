import { Link, useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="w-64 bg-gray-800 text-white p-5">
      <h2 className="text-xl mb-5">Dashboard</h2>

      <Link to="profile" className="block mb-3">
        Profile
      </Link>
      <Link to="settings" className="block mb-3">
        Settings
      </Link>

      <button onClick={logout} className="mt-5 bg-red-500 p-2 rounded">
        Logout
      </button>
    </div>
  );
}

export default Sidebar;

import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <>
      <h1>Home Page</h1>
      <button onClick={() => navigate("/about")}>Go to About</button>
    </>
  );
}

export default Home;

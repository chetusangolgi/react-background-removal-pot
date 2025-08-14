import { useNavigate } from "react-router-dom";

function GreetingPage() {
  const navigate = useNavigate();

  return (
    <div className="gg-container">
      <div className="wlcom-g-container">
        <div className="left-content">
          <div className="start-container">
            <img src="/startg.png" alt="" />
          </div>
          <div className="heading-container">
            <h1>
            </h1>
          </div>
        </div>
        <div className="button-container-wlcm">
          <button onClick={() => navigate("/photo")}>START</button>
        </div>
      </div>
    </div>
  );
}

export default GreetingPage;

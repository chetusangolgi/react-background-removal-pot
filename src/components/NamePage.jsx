// import { useDispatch } from 'react-redux';
// import { setName } from '../features/appSlice';
// import { useNavigate } from 'react-router-dom';
// import { useState } from 'react';

// function NamePage() {
//   const [name, setNameState] = useState('');
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   const handleSubmit = () => {
//     dispatch(setName(name));
//     navigate('/photo');
//   };

//   return (
//     <div className='main-container'>
//       <h1>Enter Your Name</h1>
//       <input value={name} onChange={(e) => setNameState(e.target.value)} />
//       <button onClick={handleSubmit}>Submit</button>
//     </div>
//   );
// }

// export default NamePage;



import { useDispatch } from 'react-redux';
import { setName } from '../features/appSlice';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

function NamePage() {
  const [name, setNameState] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = () => {
    dispatch(setName(name));
    navigate('/photo');
  };
  return (
    <div
      style={{
        backgroundImage: 'url("../bg2.png")', // Replace with your image URL
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end', // Push content to the bottom
        alignItems: 'center',
        backgroundRepeat: 'no-repeat',
        width: '100vw',
        paddingBottom: '50px' // Add padding to ensure content is not at the very bottom
      }}
    >
    <input
  value={name}
  placeholder='Enter your name'
  onChange={(e) => setNameState(e.target.value)}
  style={{
    padding: '30px',
    fontSize: '30px',
    width: '800px',
    marginBottom: '20px',
    borderRadius: '10px',
    border: 'none',
    textAlign: 'left', // Start typing from the left
    outline: 'none', // Remove default focus outline
    marginTop:"40%"
  }}
/>

     <button
  onClick={handleSubmit}
  style={{
    width: '800px',
    height: '80px',
    backgroundColor: '#FAB200', // Green background
    color: '#00000',
    border: 'none',
    borderRadius: '5px',
    fontSize: '36px',
    cursor: 'pointer',
    textAlign: 'center', // Ensures horizontal centering
    display: 'flex', // Use flexbox for vertical centering
    justifyContent: 'center', // Center horizontally
    alignItems: 'center', 
    marginBottom:"20%"
  }}
>
  Submit
</button>

    </div>
  );
}


export default NamePage;

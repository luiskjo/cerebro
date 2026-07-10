import { useNavigate } from 'react-router-dom';

export default function BackButton() {
  const navigate = useNavigate();
  return (
    <button className="btn-outline" onClick={() => navigate('/')}>
      ← Back
    </button>
  );
}

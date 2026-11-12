// Owner: Zi Ying – back button + page title, used at the top of most screens.
// back: a path like "/cart", or leave it out to go to the previous page.
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';

export default function PageHeader({ title, back, right }) {
  const navigate = useNavigate();
  return (
    <header className="page-head">
      <button type="button" className="icon-btn" onClick={() => (back ? navigate(back) : navigate(-1))} aria-label="Go back">
        <Icon name="back" />
      </button>
      <h1 className="grow">{title}</h1>
      {right}
    </header>
  );
}
import { Link } from 'react-router-dom';

export default function ShellBrandLink() {
  return (
    <Link className="oc-shell-brand" to="/dashboard" aria-label="VELKERN dashboard" data-shell-brand="velkern">
      <img
        className="oc-shell-brand__mark"
        src="/velkern-mini-logo.png"
        alt="VELKERN"
        data-shell-brand-mark="velkern"
        draggable={false}
      />
    </Link>
  );
}

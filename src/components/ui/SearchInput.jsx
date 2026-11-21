import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import styles from './SearchInput.module.css';

function SearchInput({ value, onChange, placeholder = 'Buscar...', label = 'Buscar' }) {
  return (
    <label className={styles.search}>
      <span className="sr-only">{label}</span>
      <FontAwesomeIcon icon={faMagnifyingGlass} className={styles.icon} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
      />
    </label>
  );
}

export default SearchInput;

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import styles from './SearchInput.module.css';

interface Props {
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  label?: string;
}

function SearchInput({ value, onChange, placeholder = 'Buscar...', label = 'Buscar' }: Props) {
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

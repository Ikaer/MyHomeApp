import React, { useMemo, useState } from 'react';
import styles from './SeasonSelector.module.css';
import { getSeasonInfos } from '@/lib/animeUtils';

type Season = 'winter' | 'spring' | 'summer' | 'fall';
export type SeasonInfo = { year: number; season: Season };

interface SeasonSelectorProps {
  value: SeasonInfo[];
  onChange: (v: SeasonInfo[]) => void;
}

const SeasonSelector: React.FC<SeasonSelectorProps> = ({ value, onChange }) => {
  const infos = getSeasonInfos();
  const [showAdd, setShowAdd] = useState(false);
  const [season, setSeason] = useState<Season>('winter');
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [year, setYear] = useState<number>(currentYear);

  const addUnique = (s: SeasonInfo[]) => {
    const key = (x: SeasonInfo) => `${x.year}-${x.season}`;
    const merged = [...value];
    for (const it of s) {
      if (!merged.find(m => key(m) === key(it))) merged.push(it);
    }
    onChange(merged);
  };

  const remove = (s: SeasonInfo) => {
    onChange(value.filter(v => !(v.year === s.year && v.season === s.season)));
  };

  const presets = (
    <div className={styles.row}>
      <button type="button" className={styles.presetBtn} onClick={() => addUnique([infos.current])}>Current</button>
      <button type="button" className={styles.presetBtn} onClick={() => addUnique([infos.current, infos.previous])}>Current + Prev</button>
      <button type="button" className={styles.presetBtn} onClick={() => addUnique([infos.next])}>Next</button>
      <button type="button" className={styles.presetBtn} onClick={() => onChange([])}>Clear</button>
      <button type="button" className={styles.presetBtn} onClick={() => setShowAdd(s => !s)}>{showAdd ? 'Close' : '+ Add'}</button>
    </div>
  );

  return (
    <div className={styles.container}>
      {presets}
      {showAdd && (
        <div className={styles.addRow}>
          <label>
            Season:
            <select value={season} onChange={(e) => setSeason(e.target.value as Season)}>
              <option value="winter">Winter</option>
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="fall">Fall</option>
            </select>
          </label>
          <label>
            Year:
            <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value || currentYear.toString(), 10))} style={{width: 90}} />
          </label>
          <button type="button" className={styles.presetBtn} onClick={() => addUnique([{ year, season }])}>Add</button>
        </div>
      )}
      {value.length > 0 && (
        <div className={styles.chipsList}>
          {value.map((s, idx) => (
            <span key={idx} className={`${styles.chip} ${styles.chipActive}`}>
              {s.season} {s.year}
              <button type="button" className={styles.remove} onClick={() => remove(s)}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default SeasonSelector;

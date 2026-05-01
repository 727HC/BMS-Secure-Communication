import { useId, useState, type KeyboardEvent } from 'react';
import { ChevronDownIcon, ExpandIcon, FleetGauge } from './Glyphs';
import { FLEET_LEGEND, type FleetGaugeViewModel, type PassportOptionViewModel } from './lib';

interface Props {
  selectedPassportLabel: string;
  selectedPassportId: string | null;
  selectorTitle: string;
  selectorButtonLabel: string;
  selectorDisabled: boolean;
  passportOptions: PassportOptionViewModel[];
  onPassportSelect: (id: string) => void;
  fleetGauges: FleetGaugeViewModel[];
}

export default function BatteryMonitor({
  selectedPassportLabel,
  selectedPassportId,
  selectorTitle,
  selectorButtonLabel,
  selectorDisabled,
  passportOptions,
  onPassportSelect,
  fleetGauges,
}: Props) {
  const listboxId = useId();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSelect = (id: string) => {
    onPassportSelect(id);
    setMenuOpen(false);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setMenuOpen(false);
    }
  };

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(id);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setMenuOpen(false);
    }
  };

  return (
    <article className="vk-card vk-fleet">
      <div className="vk-card__head">
        <div>
          <h2 className="vk-card__title">배터리 모니터</h2>
          <p className="vk-card__sub">Viewing: {selectedPassportLabel}</p>
        </div>
        <div
          className="vk-battery-select"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
          }}
        >
          <button
            type="button"
            className="vk-selectbtn"
            title={selectorTitle}
            aria-label={`배터리 선택: ${selectorTitle}`}
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? listboxId : undefined}
            disabled={selectorDisabled}
            onClick={() => setMenuOpen((open) => !open)}
            onKeyDown={handleTriggerKeyDown}
          >
            <span>{selectorButtonLabel}</span>
            <ChevronDownIcon />
          </button>
          {menuOpen ? (
            <div id={listboxId} className="vk-battery-select__menu" role="listbox" aria-label="배터리 선택">
              {passportOptions.map((option) => {
                const selected = option.id === selectedPassportId;
                return (
                  <div
                    key={option.id}
                    role="option"
                    aria-selected={selected}
                    tabIndex={0}
                    className={`vk-battery-option${selected ? ' vk-battery-option--selected' : ''}`}
                    onClick={() => handleSelect(option.id)}
                    onKeyDown={(event) => handleOptionKeyDown(event, option.id)}
                  >
                    <span className="vk-battery-option__label">{option.label}</span>
                    <span className="vk-battery-option__meta">{option.status}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
      <div className="vk-fleet__body">
        <div className="vk-fleet__visual" aria-hidden="true">
          <img className="vk-fleet__image" src="/dashboard-fleet-chassis-cutout.png" alt="" loading="eager" decoding="async" />
          <span className="vk-fleet__expand">
            <ExpandIcon />
          </span>
        </div>
        <div className="vk-fleet__gauges">
          {fleetGauges.map((g) => (
            <FleetGauge key={g.label} label={g.label} value={g.value} tone={g.tone} />
          ))}
        </div>
      </div>
      <div className="vk-fleet__legend" aria-label="Fleet status legend">
        {FLEET_LEGEND.map((item) => (
          <span key={item.label} className={`vk-fleet__legend-item vk-fleet__legend-item--${item.tone}`}>
            {item.label}
          </span>
        ))}
      </div>
    </article>
  );
}

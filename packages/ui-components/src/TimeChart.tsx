/**
 * @buddy/ui-components - TimeChart.tsx
 * Pure, accessible, zero-leak declarative SVG charting component.
 * Supports bar trends, horizontal platform breakdowns, and category donuts.
 * Fully accessible with screen-reader data summaries and authentic empty states.
 */

export interface ChartDataPoint {
  label: string;
  value: number; // In ms, minutes, or counts
  color?: string;
  sublabel?: string;
}

export interface TimeChartProps {
  title?: string;
  type: 'bar' | 'horizontal-bar' | 'donut';
  data: ChartDataPoint[];
  unit?: string;
  formatValue?: (val: number) => string;
  height?: number;
  emptyMessage?: string;
}

export function TimeChart({
  title,
  type,
  data,
  unit = 'min',
  formatValue = (v) => `${Math.round(v)} ${unit}`,
  height = 180,
  emptyMessage = 'No activity yet',
}: TimeChartProps) {
  const totalValue = data.reduce((acc, curr) => acc + curr.value, 0);
  const isEmpty = data.length === 0 || totalValue === 0;

  if (isEmpty) {
    return (
      <div
        className="buddy-time-chart-empty"
        style={{
          height: `${height}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--buddy-bg-card)',
          borderRadius: 'var(--buddy-radius-md)',
          border: '1px dashed var(--buddy-border-subtle)',
          padding: '16px',
          color: 'var(--buddy-text-muted)',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.6 }}>📊</span>
        <span style={{ fontSize: '13px', fontWeight: 500 }}>{emptyMessage}</span>
        <span style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
          Activity will appear here as you browse supported platforms.
        </span>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const chartAriaLabel = `${title || 'Activity Chart'}: ${data
    .map((d) => `${d.label} ${formatValue(d.value)}`)
    .join(', ')}`;

  return (
    <div
      className="buddy-time-chart"
      style={{
        backgroundColor: 'var(--buddy-bg-card)',
        borderRadius: 'var(--buddy-radius-md)',
        border: '1px solid var(--buddy-border-subtle)',
        padding: '16px',
        marginBottom: '12px',
      }}
    >
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--buddy-text-main)' }}>
            {title}
          </h4>
          <span style={{ fontSize: '12px', color: 'var(--buddy-text-muted)' }}>
            Total: {formatValue(totalValue)}
          </span>
        </div>
      )}

      {/* Screen Reader Accessible Data Representation */}
      <div className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        <table>
          <caption>{title || 'Activity Data Summary'}</caption>
          <thead>
            <tr><th>Item</th><th>Value</th></tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <td>{d.label}</td>
                <td>{formatValue(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 1. Bar Chart (e.g. 7-day trend) */}
      {type === 'bar' && (
        <svg
          role="img"
          aria-label={chartAriaLabel}
          width="100%"
          height={height}
          viewBox={`0 0 ${data.length * 48} ${height}`}
          preserveAspectRatio="none"
          style={{ overflow: 'visible' }}
        >
          {data.map((point, index) => {
            const barHeight = Math.max(4, (point.value / maxValue) * (height - 40));
            const x = index * 48 + 10;
            const y = height - 25 - barHeight;
            const barColor = point.color || 'var(--buddy-accent-blue)';

            return (
              <g key={point.label}>
                <rect
                  x={x}
                  y={y}
                  width="28"
                  height={barHeight}
                  rx="4"
                  fill={barColor}
                  style={{ transition: 'all 0.3s ease' }}
                >
                  <title>{`${point.label}: ${formatValue(point.value)}`}</title>
                </rect>
                <text
                  x={x + 14}
                  y={height - 8}
                  textAnchor="middle"
                  fill="var(--buddy-text-muted)"
                  fontSize="11"
                  fontWeight="500"
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {/* 2. Horizontal Bar Chart (e.g. Platforms breakdown) */}
      {type === 'horizontal-bar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.map((point) => {
            const pct = Math.min(100, Math.round((point.value / maxValue) * 100));
            return (
              <div key={point.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--buddy-text-main)', fontWeight: 500 }}>{point.label}</span>
                  <span style={{ color: 'var(--buddy-text-muted)' }}>{formatValue(point.value)}</span>
                </div>
                <div
                  style={{
                    height: '8px',
                    backgroundColor: 'var(--buddy-bg-hover)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: point.color || 'var(--buddy-accent-blue)',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Donut Chart (e.g. Category proportions) */}
      {type === 'donut' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '16px' }}>
          <svg
            role="img"
            aria-label={chartAriaLabel}
            width="110"
            height="110"
            viewBox="0 0 42 42"
            style={{ transform: 'rotate(-90deg)' }}
          >
            {(() => {
              let cumulativePct = 0;
              return data.map((point) => {
                const pct = (point.value / totalValue) * 100;
                const strokeDasharray = `${pct} ${100 - pct}`;
                const strokeDashoffset = -cumulativePct;
                cumulativePct += pct;

                return (
                  <circle
                    key={point.label}
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke={point.color || 'var(--buddy-accent-blue)'}
                    strokeWidth="5"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                  >
                    <title>{`${point.label}: ${formatValue(point.value)} (${Math.round(pct)}%)`}</title>
                  </circle>
                );
              });
            })()}
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
            {data.map((point) => (
              <div key={point.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    backgroundColor: point.color || 'var(--buddy-accent-blue)',
                  }}
                />
                <span style={{ color: 'var(--buddy-text-main)', fontWeight: 500 }}>{point.label}:</span>
                <span style={{ color: 'var(--buddy-text-muted)' }}>{formatValue(point.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

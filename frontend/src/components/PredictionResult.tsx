import type { JobResponse } from '../api/client';

interface PredictionResultProps {
  job: JobResponse;
}

export default function PredictionResult({ job }: PredictionResultProps) {
  if (job.status === 'pending') {
    return (
      <section className="result">
        <img className="result-image" src={job.imageUrl} alt="Uploaded pet" />
        <p className="pending">
          <span className="spinner" /> Reading the expression...
        </p>
      </section>
    );
  }

  if (job.status === 'failed') {
    return (
      <section className="result">
        <p className="error">{job.error ?? 'The image could not be processed'}</p>
      </section>
    );
  }

  const probabilities = job.probabilities ?? {};
  const ranked = Object.entries(probabilities).sort(([, a], [, b]) => b - a);
  const confidence = ((job.confidence ?? 0) * 100).toFixed(1);

  return (
    <section className="result">
      <img className="result-image" src={job.imageUrl} alt="Uploaded pet" />
      <h2>
        {job.label} <span className="confidence">{confidence}%</span>
      </h2>
      <ul className="bars">
        {ranked.map(([name, value]) => (
          <li key={name}>
            <span className="bar-label">{name}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${value * 100}%` }} />
            </div>
            <span className="bar-value">{(value * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

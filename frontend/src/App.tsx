import { useEffect, useRef, useState } from 'react';
import { createPrediction, createSamplePrediction, getPrediction, getSamples } from './api/client';
import type { JobResponse, SampleImage } from './api/client';
import PredictionResult from './components/PredictionResult';
import UploadForm from './components/UploadForm';
import type { Selection } from './components/UploadForm';
import { getSocket } from './io/socket';
import './App.css';

const LAST_JOB_KEY = 'lastJobId';

export default function App() {
  const [job, setJob] = useState<JobResponse | null>(null);
  const [samples, setSamples] = useState<SampleImage[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const watchedJobId = useRef('');

  function applyJobUpdate(current: JobResponse) {
    setJob((previous) => {
      // never downgrade a terminal result back to pending -- the GET that
      // closes the join race can resolve after the socket event
      if (previous && previous.jobId === current.jobId && previous.status !== 'pending') {
        return previous;
      }
      return current;
    });
  }

  function watchJob(jobId: string) {
    watchedJobId.current = jobId;
    // join the room FIRST, then one GET -- if inference finished before the
    // join landed, the GET still delivers the result
    getSocket().emit('job:watch', jobId);
    getPrediction(jobId)
      .then((current) => {
        if (watchedJobId.current === jobId) {
          applyJobUpdate(current);
        }
      })
      .catch(() => {
        // the socket event can still deliver the result
      });
  }

  useEffect(() => {
    const socket = getSocket();
    function onJobDone(payload: JobResponse) {
      if (payload.jobId === watchedJobId.current) {
        applyJobUpdate(payload);
      }
    }
    socket.on('job:done', onJobDone);

    // the demo thumbnails are optional -- the app works without them
    getSamples().then(setSamples).catch(() => {});

    // refresh recovery: resume watching the last job of this tab
    const lastJobId = sessionStorage.getItem(LAST_JOB_KEY);
    if (lastJobId) {
      watchJob(lastJobId);
    }

    return () => {
      socket.off('job:done', onJobDone);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload(selection: Selection) {
    setErrorMessage('');
    setUploading(true);
    try {
      const created = selection.kind === 'file'
        ? await createPrediction(selection.file)
        : await createSamplePrediction(selection.sample.name);
      sessionStorage.setItem(LAST_JOB_KEY, created.jobId);
      setJob(created);
      watchJob(created.jobId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The upload failed, please try again');
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="app">
      <h1>Pet Expressions</h1>
      <p className="subtitle">
        Our ResNet-18 model reads your cat's or dog's facial expression:
        Angry, Sad, or happy. It was trained on cats and dogs only, so a
        photo of any other animal (or anything else) will most likely come
        back as Other.
      </p>

      <UploadForm samples={samples} uploading={uploading} onUpload={handleUpload} />

      {errorMessage && <p className="error">{errorMessage}</p>}
      {job && <PredictionResult job={job} />}
    </main>
  );
}

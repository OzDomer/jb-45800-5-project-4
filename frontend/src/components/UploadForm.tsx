import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { SampleImage } from '../api/client';

export type Selection =
  | { kind: 'file'; file: File; previewUrl: string }
  | { kind: 'sample'; sample: SampleImage };

interface UploadFormProps {
  samples: SampleImage[];
  uploading: boolean;
  onUpload: (selection: Selection) => void;
}

export default function UploadForm({ samples, uploading, onUpload }: UploadFormProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function releasePreview(previous: Selection | null) {
    if (previous?.kind === 'file') {
      URL.revokeObjectURL(previous.previewUrl);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelection((previous) => {
      releasePreview(previous);
      return file ? { kind: 'file', file, previewUrl: URL.createObjectURL(file) } : null;
    });
  }

  function handleSampleClick(sample: SampleImage) {
    // picking a sample clears any picked file, and vice versa
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setSelection((previous) => {
      releasePreview(previous);
      return { kind: 'sample', sample };
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (selection) {
      onUpload(selection);
    }
  }

  const previewUrl = selection?.kind === 'file' ? selection.previewUrl
    : selection?.kind === 'sample' ? selection.sample.imageUrl
    : '';
  const pickerLabel = selection?.kind === 'file' ? selection.file.name
    : selection?.kind === 'sample' ? selection.sample.name.replace(/_/g, ' ')
    : 'Choose a pet photo...';

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label className="file-picker">
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} />
        {pickerLabel}
      </label>

      {samples.length > 0 && (
        <div className="samples">
          <span className="samples-title">...or try one of these:</span>
          <div className="samples-row">
            {samples.map((sample) => (
              <button
                key={sample.name}
                type="button"
                className={
                  'sample-thumb' +
                  (selection?.kind === 'sample' && selection.sample.name === sample.name
                    ? ' selected'
                    : '')
                }
                onClick={() => handleSampleClick(sample)}
                title={sample.name.replace(/_/g, ' ')}
              >
                <img src={sample.imageUrl} alt={sample.name.replace(/_/g, ' ')} />
              </button>
            ))}
          </div>
        </div>
      )}

      {previewUrl && <img className="preview" src={previewUrl} alt="Selected pet" />}

      <button type="submit" disabled={!selection || uploading}>
        {uploading ? 'Uploading...' : 'Predict expression'}
      </button>
    </form>
  );
}

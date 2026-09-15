import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

interface UploadFormProps {
  uploading: boolean;
  onUpload: (file: File) => void;
}

export default function UploadForm({ uploading, onUpload }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setPreviewUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return selected ? URL.createObjectURL(selected) : '';
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (file) {
      onUpload(file);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label className="file-picker">
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {file ? file.name : 'Choose a pet photo...'}
      </label>

      {previewUrl && <img className="preview" src={previewUrl} alt="Selected pet" />}

      <button type="submit" disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Predict expression'}
      </button>
    </form>
  );
}

import React, { useEffect, useState } from 'react';
import FastImage, { FastImageProps, Source } from 'react-native-fast-image';
import { resolveMediaUrlCandidates } from '../../api/AxiosClient';

type MediaImageProps = Omit<FastImageProps, 'source'> & {
  path?: string | null;
  placeholder: Source | number;
};

// Shows a media path from the API, trying each storage location (S3 -> server storage)
// before falling back to the placeholder.
const MediaImage = ({ path, placeholder, onError, ...rest }: MediaImageProps) => {
  const candidates = resolveMediaUrlCandidates(path);
  const [index, setIndex] = useState(0);
  const firstCandidate = candidates[0];

  useEffect(() => {
    setIndex(0);
  }, [firstCandidate]);

  const uri = candidates[index];

  return (
    <FastImage
      {...rest}
      source={uri ? { uri } : placeholder}
      onError={() => {
        if (uri) setIndex(i => i + 1);
        onError?.();
      }}
    />
  );
};

export default MediaImage;

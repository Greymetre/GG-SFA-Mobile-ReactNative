import React, { useEffect, useState } from 'react';
import FastImage, { FastImageProps, Source } from 'react-native-fast-image';
import { resolveMediaUrlCandidates } from '../../api/AxiosClient';
import NoImagePlaceholder from './NoImagePlaceholder';

type MediaImageProps = Omit<FastImageProps, 'source'> & {
  path?: string | null;
  // Without a placeholder, a themed "No Image" box is shown instead.
  placeholder?: Source | number;
};

// Shows a media path from the API, trying each storage location (S3 -> server storage)
// before falling back to the placeholder (or the "No Image" box).
const MediaImage = ({ path, placeholder, onError, style, ...rest }: MediaImageProps) => {
  const candidates = resolveMediaUrlCandidates(path);
  const [index, setIndex] = useState(0);
  const firstCandidate = candidates[0];

  useEffect(() => {
    setIndex(0);
  }, [firstCandidate]);

  const uri = candidates[index];

  if (!uri && !placeholder) {
    return <NoImagePlaceholder style={style as any} />;
  }

  return (
    <FastImage
      {...rest}
      style={style}
      source={uri ? { uri } : placeholder!}
      onError={() => {
        if (uri) setIndex(i => i + 1);
        onError?.();
      }}
    />
  );
};

export default MediaImage;

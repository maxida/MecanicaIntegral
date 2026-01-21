import React, { useEffect, useMemo, useState } from 'react';
import { Image, ImageProps, ImageSourcePropType, ImageErrorEventData, NativeSyntheticEvent } from 'react-native';

type UniversalImageProps = Omit<ImageProps, 'source'> & {
  uri?: string | null;
  source?: ImageSourcePropType;
  placeholderSource?: ImageSourcePropType;
};

const DEFAULT_PLACEHOLDER = require('../assets/images/logo-mecanica-integral.png');

const isRemoteLike = (value: string) => /^(https?:|file:|data:)/i.test(value);

const UniversalImage = ({ uri, source, placeholderSource, onError, ...rest }: UniversalImageProps) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri, source]);

  const resolvedSource = useMemo<ImageSourcePropType>(() => {
    const fallback = placeholderSource || DEFAULT_PLACEHOLDER;

    if (failed) return fallback;

    if (source) return source;

    if (typeof uri === 'string' && uri.length > 0) {
      if (isRemoteLike(uri)) return { uri };
      return fallback;
    }

    return fallback;
  }, [failed, source, uri, placeholderSource]);

  return (
    <Image
      {...rest}
      source={resolvedSource}
      onError={(event: NativeSyntheticEvent<ImageErrorEventData>) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
};

export default UniversalImage;

import React from 'react';

import { MobileWebOnly } from '@/components/mobile-web-only';
import { withProtectedMangakaRoute } from '@/components/protected-route';

function StudioScreen() {
  return <MobileWebOnly title="Studio" />;
}

export default withProtectedMangakaRoute(StudioScreen);

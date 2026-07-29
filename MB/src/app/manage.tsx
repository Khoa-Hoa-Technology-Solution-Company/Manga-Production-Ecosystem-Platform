import React from 'react';

import { MobileWebOnly } from '@/components/mobile-web-only';
import { withProtectedMangakaRoute } from '@/components/protected-route';

function ManageScreen() {
  return <MobileWebOnly title="Series management" />;
}

export default withProtectedMangakaRoute(ManageScreen);

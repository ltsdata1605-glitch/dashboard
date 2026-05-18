import React from 'react';
import { Employee, BonusMetrics } from '../../../../types/nhanVienTypes';
import { MedalBadge } from '../../shared/Badges';

// Note: AvatarDisplay is currently defined inside BonusTab.tsx. We will need to either extract it or we just use it if we extract it too.
// Wait, AvatarDisplay uses IndexedDB directly, which is fine to extract.

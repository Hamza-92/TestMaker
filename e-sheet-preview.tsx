import React from 'react';
import { createRoot } from 'react-dom/client';
import './resources/css/app.css';
import { ESheetView } from './resources/js/pages/customer/papers/paper-layouts/e-sheet/e-sheet-view';
import type { GeneratedPaper } from './resources/js/pages/customer/papers/paper-layouts/types';

createRoot(document.getElementById('app')!).render(
    <ESheetView
        paper={{ id: 1, header: { subject: 'Biology' }, sections: [] } as unknown as GeneratedPaper}
        setIndex={0}
        onBack={() => {}}
    />,
);

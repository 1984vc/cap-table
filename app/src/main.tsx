import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './app/contexts/AuthContext';
import { BusinessProvider } from './app/contexts/BusinessContext';
import { router } from './app/router';
import './app/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BusinessProvider>
        <RouterProvider router={router} />
      </BusinessProvider>
    </AuthProvider>
  </StrictMode>
);
```

**Save (Ctrl+S) and close**

---

## ✅ **WHAT THIS FIXES**

The correct provider hierarchy is:
```
<AuthProvider>           ← Provides user/session
  <BusinessProvider>      ← Provides companies (needs user from AuthProvider)
    <RouterProvider />    ← All routes
  </BusinessProvider>
</AuthProvider>